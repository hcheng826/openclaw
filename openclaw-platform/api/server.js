const fastify = require('fastify')({ logger: true });
const Docker = require('dockerode');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' });
const PORT = process.env.PORT || 3001;
const BASE_PORT = parseInt(process.env.INSTANCE_BASE_PORT || '20000');
const DATA_DIR = process.env.DATA_DIR || '/data/instances';
const HOST_DATA_DIR = process.env.HOST_DATA_DIR || '/home/ubuntu/openclaw-platform/data/instances';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// In-memory storage for MVP (use PostgreSQL in production)
const users = new Map();
const instances = new Map();
let nextPort = BASE_PORT;

// Generate secure password
function generatePassword() {
  return crypto.randomBytes(16).toString('hex').slice(0, 16);
}

// Generate auth token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// JWT authentication hook
async function authenticate(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing or invalid authorization header' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    request.user = decoded;
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
}

// Generate OpenClaw config
function generateOpenClawConfig(config) {
  return {
    meta: {
      lastTouchedVersion: "2026.2.1",
      lastTouchedAt: new Date().toISOString()
    },
    wizard: {
      lastRunAt: new Date().toISOString(),
      lastRunVersion: "2026.2.1",
      lastRunCommand: "onboard",
      lastRunMode: "local"
    },
    auth: {
      profiles: {
        "kimi-coding:default": {
          provider: "kimi-coding",
          mode: "api_key"
        }
      }
    },
    agents: {
      defaults: {
        model: {
          primary: config.modelProvider
        },
        models: {
          [config.modelProvider]: {
            alias: "AI Model"
          }
        },
        workspace: "/home/node/.openclaw/workspace",
        compaction: { mode: "safeguard" },
        maxConcurrent: 4,
        subagents: { maxConcurrent: 8 }
      }
    },
    messages: { ackReactionScope: "group-mentions" },
    commands: { native: "auto", nativeSkills: "auto" },
    gateway: {
      port: 18789,
      mode: "local",
      bind: "lan",
      auth: {
        mode: "password",
        password: config.password
      },
      tailscale: { mode: "off", resetOnExit: false }
    },
    plugins: {
      entries: {
        telegram: { enabled: true }
      }
    },
    channels: {
      telegram: {
        enabled: true,
        botToken: config.telegramToken,
        dmPolicy: "pairing"
      }
    }
  };
}

// Generate auth profiles
function generateAuthProfiles(apiKey) {
  return {
    version: 1,
    profiles: {
      "kimi-coding:default": {
        type: "api_key",
        provider: "kimi-coding",
        key: apiKey
      }
    },
    lastGood: {
      "kimi-coding": "kimi-coding:default"
    },
    usageStats: {
      "kimi-coding:default": {
        lastUsed: 0,
        errorCount: 0
      }
    }
  };
}

// User Registration
fastify.post('/auth/register', async (request, reply) => {
  try {
    const { email, password } = request.body;
    
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password required' });
    }
    
    if (password.length < 8) {
      return reply.code(400).send({ error: 'Password must be at least 8 characters' });
    }
    
    if (users.has(email)) {
      return reply.code(409).send({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    
    users.set(email, {
      id: userId,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    });
    
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
    
    return {
      message: 'User registered successfully',
      token,
      user: { id: userId, email }
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// User Login
fastify.post('/auth/login', async (request, reply) => {
  try {
    const { email, password } = request.body;
    
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password required' });
    }
    
    const user = users.get(email);
    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    
    return {
      message: 'Login successful',
      token,
      user: { id: user.id, email }
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Get current user
fastify.get('/auth/me', { preHandler: authenticate }, async (request, reply) => {
  return { user: request.user };
});

// Create instance endpoint (protected)
fastify.post('/instances', { preHandler: authenticate }, async (request, reply) => {
  try {
    const { modelProvider, apiKey, telegramToken } = request.body;
    const userId = request.user.userId;
    const email = request.user.email;

    if (!modelProvider || !apiKey || !telegramToken) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    // Generate instance details
    const instanceId = crypto.randomUUID();
    const port = nextPort++;
    const password = generatePassword();
    const token = generateToken();
    const subdomain = `user-${instanceId.slice(0, 8)}`;

    // Create directories
    const instanceDir = path.join(DATA_DIR, instanceId);
    const agentDir = path.join(instanceDir, 'agents', 'main', 'agent');
    await fs.mkdir(agentDir, { recursive: true });

    // Write config files
    const openclawConfig = generateOpenClawConfig({
      modelProvider,
      telegramToken,
      password
    });
    
    await fs.writeFile(
      path.join(instanceDir, 'openclaw.json'),
      JSON.stringify(openclawConfig, null, 2)
    );

    const authProfiles = generateAuthProfiles(apiKey);
    await fs.writeFile(
      path.join(agentDir, 'auth-profiles.json'),
      JSON.stringify(authProfiles, null, 2)
    );

    // Create and start Docker container
    const container = await docker.createContainer({
      Image: 'openclaw:local',
      name: `openclaw-${instanceId.slice(0, 8)}`,
      Env: [
        `HOME=/home/node`,
        `OPENCLAW_GATEWAY_TOKEN=${token}`,
        `NODE_ENV=production`
      ],
      HostConfig: {
        PortBindings: {
          '18789/tcp': [{ HostPort: port.toString() }]
        },
        Binds: [
          `${path.join(HOST_DATA_DIR, instanceId)}:/home/node/.openclaw`,
        ],
        RestartPolicy: { Name: 'unless-stopped' }
      },
      Cmd: ['node', 'dist/index.js', 'gateway', '--bind', 'lan', '--port', '18789']
    });

    await container.start();

    // Store instance info
    const instance = {
      id: instanceId,
      userId,
      email,
      port,
      password,
      token,
      subdomain,
      containerId: container.id,
      status: 'running',
      createdAt: new Date().toISOString(),
      dashboardUrl: `https://ip-10-0-24-43.tail9f77e8.ts.net:${port + 10000}`,
      modelProvider,
      telegramBotUsername: telegramToken.split(':')[0]
    };
    
    instances.set(instanceId, instance);

    fastify.log.info(`Instance created: ${instanceId} for user ${email} on port ${port}`);

    return {
      id: instanceId,
      dashboardUrl: instance.dashboardUrl,
      password,
      telegramBotUsername: `bot_${telegramToken.split(':')[0]}`,
      status: 'running'
    };

  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Get user's instances
fastify.get('/instances', { preHandler: authenticate }, async (request, reply) => {
  const userId = request.user.userId;
  const userInstances = Array.from(instances.values())
    .filter(inst => inst.userId === userId)
    .map(inst => ({
      id: inst.id,
      dashboardUrl: inst.dashboardUrl,
      status: inst.status,
      createdAt: inst.createdAt,
      modelProvider: inst.modelProvider
    }));
  
  return { instances: userInstances };
});

// Get instance status (protected)
fastify.get('/instances/:id', { preHandler: authenticate }, async (request, reply) => {
  const instance = instances.get(request.params.id);
  if (!instance) {
    return reply.code(404).send({ error: 'Instance not found' });
  }
  
  // Check ownership
  if (instance.userId !== request.user.userId) {
    return reply.code(403).send({ error: 'Access denied' });
  }
  
  return instance;
});

// Health check (public)
fastify.get('/health', async () => {
  return { status: 'ok', instances: instances.size, users: users.size };
});

// Start server
async function start() {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`API server running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();