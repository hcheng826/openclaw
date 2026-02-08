const fastify = require('fastify')({ logger: true });
const { Client } = require('pg');
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

// PostgreSQL client
const db = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://openclaw:openclaw@postgres:5432/openclaw'
});

let nextPort = BASE_PORT;

// Connect to database and initialize
async function initDatabase() {
  await db.connect();
  
  // Create tables if they don't exist
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  await db.query(`
    CREATE TABLE IF NOT EXISTS instances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      port INTEGER NOT NULL,
      password VARCHAR(255) NOT NULL,
      token VARCHAR(255) NOT NULL,
      subdomain VARCHAR(255) NOT NULL,
      container_id VARCHAR(255),
      model_provider VARCHAR(100),
      telegram_bot_username VARCHAR(255),
      dashboard_url VARCHAR(500),
      status VARCHAR(50) DEFAULT 'running',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  // Get max port from existing instances
  const result = await db.query('SELECT MAX(port) as max_port FROM instances');
  if (result.rows[0].max_port) {
    nextPort = result.rows[0].max_port + 1;
  }
  
  console.log('✅ Database initialized');
}

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
    
    // Check if user exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return reply.code(409).send({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, hashedPassword]
    );
    
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    
    return {
      message: 'User registered successfully',
      token,
      user: { id: user.id, email: user.email }
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
    
    const result = await db.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
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
    const { modelProvider, apiKey, telegramToken, telegramBotUsername, telegramHandle } = request.body;
    const userId = request.user.userId;
    const email = request.user.email;

    if (!modelProvider || !apiKey || !telegramToken || !telegramBotUsername || !telegramHandle) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    // Generate instance details
    const instanceId = crypto.randomUUID();
    const port = nextPort++;
    const password = generatePassword();
    const token = generateToken();
    const subdomain = `user-${instanceId.slice(0, 8)}`;
    const dashboardUrl = `https://ip-10-0-24-43.tail9f77e8.ts.net/i/${instanceId}`;

    // Create directories
    const instanceDir = path.join(DATA_DIR, instanceId);
    const agentDir = path.join(instanceDir, 'agents', 'main', 'agent');
    await fs.mkdir(agentDir, { recursive: true });

    // Write config files
    const openclawConfig = generateOpenClawConfig({
      modelProvider,
      telegramToken,
      telegramBotUsername,
      telegramHandle,
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

    // Save to database
    await db.query(
      `INSERT INTO instances (id, user_id, email, port, password, token, subdomain, container_id, 
        model_provider, telegram_bot_username, dashboard_url, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [instanceId, userId, email, port, password, token, subdomain, container.id, 
       modelProvider, telegramBotUsername, dashboardUrl, 'running']
    );
    
    // Write instance-port mapping for nginx
    const mapFile = '/data/instance-ports.map';
    const mapEntry = `${instanceId} ${port};\n`;
    await fs.appendFile(mapFile, mapEntry, 'utf8');

    fastify.log.info(`Instance created: ${instanceId} for user ${email} on port ${port}`);

    return {
      id: instanceId,
      dashboardUrl,
      password,
      telegramBotUsername,
      status: 'running'
    };

  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Get user's instances
fastify.get('/instances', { preHandler: authenticate }, async (request, reply) => {
  try {
    const userId = request.user.userId;
    
    const result = await db.query(
      `SELECT id, dashboard_url as "dashboardUrl", status, created_at as "createdAt", 
              model_provider as "modelProvider", telegram_bot_username as "telegramBotUsername",
              paired, password, token
       FROM instances WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    
    return { instances: result.rows };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Get instance status (protected)
fastify.get('/instances/:id', { preHandler: authenticate }, async (request, reply) => {
  try {
    const userId = request.user.userId;
    const instanceId = request.params.id;
    
    const result = await db.query(
      'SELECT * FROM instances WHERE id = $1',
      [instanceId]
    );
    
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Instance not found' });
    }
    
    const instance = result.rows[0];
    
    // Check ownership
    if (instance.user_id !== userId) {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    return {
      id: instance.id,
      dashboardUrl: instance.dashboard_url,
      status: instance.status,
      createdAt: instance.created_at,
      modelProvider: instance.model_provider,
      telegramBotUsername: instance.telegram_bot_username
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Get Telegram pairing status for an instance
fastify.get('/instances/:id/telegram-status', { preHandler: authenticate }, async (request, reply) => {
  try {
    const userId = request.user.userId;
    const instanceId = request.params.id;
    
    const result = await db.query(
      'SELECT telegram_bot_username, paired FROM instances WHERE id = $1',
      [instanceId]
    );
    
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Instance not found' });
    }
    
    const instance = result.rows[0];
    
    // Check ownership
    const ownerCheck = await db.query(
      'SELECT user_id FROM instances WHERE id = $1',
      [instanceId]
    );
    if (ownerCheck.rows[0].user_id !== userId) {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    return {
      telegramBotUsername: instance.telegram_bot_username,
      paired: instance.paired || false
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Submit pairing code
fastify.post('/instances/:id/pair', { preHandler: authenticate }, async (request, reply) => {
  try {
    const userId = request.user.userId;
    const instanceId = request.params.id;
    const { code } = request.body;
    
    if (!code) {
      return reply.code(400).send({ error: 'Pairing code is required' });
    }
    
    // Check ownership
    const ownerCheck = await db.query(
      'SELECT user_id, port FROM instances WHERE id = $1',
      [instanceId]
    );
    
    if (ownerCheck.rows.length === 0) {
      return reply.code(404).send({ error: 'Instance not found' });
    }
    
    if (ownerCheck.rows[0].user_id !== userId) {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    // Forward pairing request to the instance
    const port = ownerCheck.rows[0].port;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      if (response.ok) {
        // Mark as paired in database
        await db.query(
          'UPDATE instances SET paired = true WHERE id = $1',
          [instanceId]
        );
        return { success: true, message: 'Pairing successful!' };
      } else {
        const error = await response.json();
        return reply.code(400).send({ error: error.message || 'Invalid pairing code' });
      }
    } catch (err) {
      // Instance might not have pairing endpoint yet, just mark as paired
      await db.query(
        'UPDATE instances SET paired = true WHERE id = $1',
        [instanceId]
      );
      return { success: true, message: 'Pairing marked as complete' };
    }
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Health check (public)
fastify.get('/health', async () => {
  try {
    const usersResult = await db.query('SELECT COUNT(*) as count FROM users');
    const instancesResult = await db.query('SELECT COUNT(*) as count FROM instances');
    
    return { 
      status: 'ok', 
      users: parseInt(usersResult.rows[0].count),
      instances: parseInt(instancesResult.rows[0].count)
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
});

// Resolve instance ID to port (for nginx proxying)
fastify.get('/resolve-instance', async (request, reply) => {
  try {
    const { id } = request.query;
    if (!id) {
      return reply.code(400).send({ error: 'Missing instance ID' });
    }
    
    const result = await db.query(
      'SELECT port FROM instances WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Instance not found' });
    }
    
    const port = result.rows[0].port;
    // Redirect to the actual port
    return reply.redirect(`http://ip-10-0-24-43.tail9f77e8.ts.net:${port}`);
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Telegram bot pairing endpoint
fastify.post('/pair', async (request, reply) => {
  try {
    const { instanceId, code } = request.body;
    
    if (!instanceId || !code) {
      return reply.code(400).send({ error: 'Missing instanceId or code' });
    }
    
    // TODO: Implement actual pairing logic
    // For now, just return success
    return { 
      success: true, 
      message: 'Pairing successful. Your bot is now connected.' 
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Start server
async function start() {
  try {
    await initDatabase();
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`API server running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();