const fastify = require('fastify')({ logger: true });
const Docker = require('dockerode');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' });
const PORT = process.env.PORT || 3001;
const BASE_PORT = parseInt(process.env.INSTANCE_BASE_PORT || '20000');
const DATA_DIR = '/data/instances';

// In-memory storage for MVP (use PostgreSQL in production)
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

// Generate OpenClaw config
function generateOpenClawConfig(config) {
  return {
    meta: {
      lastTouchedVersion: "2026.2.6-3",
      lastTouchedAt: new Date().toISOString()
    },
    wizard: {
      lastRunAt: new Date().toISOString(),
      lastRunVersion: "2026.2.6-3",
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

// Create instance endpoint
fastify.post('/instances', async (request, reply) => {
  try {
    const { email, modelProvider, apiKey, telegramToken } = request.body;

    if (!email || !modelProvider || !apiKey || !telegramToken) {
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
          `${instanceDir}:/home/node/.openclaw`,
        ],
        RestartPolicy: { Name: 'unless-stopped' }
      },
      Cmd: ['node', 'dist/index.js', 'gateway', '--bind', 'lan', '--port', '18789']
    });

    await container.start();

    // Store instance info
    const instance = {
      id: instanceId,
      email,
      port,
      password,
      token,
      subdomain,
      containerId: container.id,
      status: 'running',
      createdAt: new Date().toISOString(),
      dashboardUrl: `https://ip-10-0-24-43.tail9f77e8.ts.net:${port + 10000}` // Assuming funnel on port+10000
    };
    
    instances.set(instanceId, instance);

    // Extract bot username from token (first part before colon)
    const botUsername = telegramToken.split(':')[0];

    fastify.log.info(`Instance created: ${instanceId} on port ${port}`);

    return {
      id: instanceId,
      dashboardUrl: instance.dashboardUrl,
      password,
      telegramBotUsername: `bot_${botUsername}`,
      status: 'running'
    };

  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Get instance status
fastify.get('/instances/:id', async (request, reply) => {
  const instance = instances.get(request.params.id);
  if (!instance) {
    return reply.code(404).send({ error: 'Instance not found' });
  }
  return instance;
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', instances: instances.size };
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