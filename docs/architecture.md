# OpenClaw Platform Architecture

A SimpleClaw-inspired managed OpenClaw hosting platform.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER LAYER                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Web UI     │  │  Telegram    │  │  Dashboard   │  │   API/Web    │   │
│  │  (Next.js)   │  │    Bot       │  │  (OpenClaw)  │  │   Hooks      │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────┘
          │                 │                 │                 │
          └─────────────────┴─────────────────┴─────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────┐
│                              PLATFORM LAYER                                  │
│                                    │                                         │
│  ┌───────────────────────────────▼──────────────────────────────────────┐   │
│  │                        API Gateway (Nginx)                            │   │
│  │           Routes: /api/* → Backend  |  /*.ts.net → Instances        │   │
│  └───────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                          │
│  ┌───────────────────────────────▼──────────────────────────────────────┐   │
│  │                    Backend API (Node.js/Fastify)                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  Auth    │ │  Deploy  │ │  Billing │ │  Config  │ │  Health  │  │   │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │ │  Checks  │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └───────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                          │
│  ┌───────────────────────────────▼──────────────────────────────────────┐   │
│  │                   Orchestrator (Docker/K8s API)                       │   │
│  │     Manages: Container lifecycle, networking, volumes, secrets       │   │
│  └───────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                          │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────────────┐
│                           INFRASTRUCTURE LAYER                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Docker Host / K8s Cluster                         │   │
│  │                                                                      │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │   │
│  │   │  Instance   │  │  Instance   │  │  Instance   │  │   Load    │ │   │
│  │   │   User A    │  │   User B    │  │   User C    │  │  Balancer │ │   │
│  │   │  (Docker)   │  │  (Docker)   │  │  (Docker)   │  │           │ │   │
│  │   │             │  │             │  │             │  │           │ │   │
│  │   │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │  │           │ │   │
│  │   │ │OpenClaw │ │  │ │OpenClaw │ │  │ │OpenClaw │ │  │           │ │   │
│  │   │ │ Gateway │ │  │ │ Gateway │ │  │ │ Gateway │ │  │           │ │   │
│  │   │ │ Port X  │ │  │ │ Port Y  │ │  │ │ Port Z  │ │  │           │ │   │
│  │   │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │  │           │ │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   PostgreSQL    │  │     Redis       │  │      Object Storage         │ │
│  │  (User data,    │  │  (Sessions,     │  │   (Backups, logs, files)    │ │
│  │   billing,      │  │   caching)      │  │                             │ │
│  │   configs)      │  │                 │  │                             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Web UI (Next.js/React)
**Purpose:** User-facing configuration wizard

**Pages:**
- `/` - Landing/marketing
- `/signup` - User registration
- `/onboard` - Step-by-step setup wizard
  - Step 1: Select AI model (Kimi, Anthropic, OpenAI)
  - Step 2: Enter API key (encrypted storage)
  - Step 3: Connect Telegram (bot token input)
  - Step 4: Deploy (one-click)
- `/dashboard` - Instance management
  - View status
  - Restart/stop instance
  - Update config
  - View logs
- `/billing` - Subscription management

**Tech Stack:**
- Next.js 14+ (App Router)
- Tailwind CSS
- React Hook Form + Zod (validation)
- TanStack Query (API calls)

### 2. Backend API (Node.js/Fastify)
**Purpose:** Business logic and orchestration

**Routes:**
```typescript
// Auth
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout

// Instance Management
POST /api/instances              // Create new instance
GET  /api/instances/:id          // Get instance status
PUT  /api/instances/:id/config   // Update configuration
POST /api/instances/:id/restart  // Restart instance
DELETE /api/instances/:id        // Delete instance

// Health & Logs
GET /api/instances/:id/health    // Health check
GET /api/instances/:id/logs      // Stream logs

// Billing (Stripe integration)
GET  /api/billing/subscription
POST /api/billing/checkout
POST /api/billing/cancel
```

### 3. Orchestrator Service
**Purpose:** Docker/container management

**Key Functions:**
```typescript
// Create isolated OpenClaw container
async function createInstance(userId: string, config: InstanceConfig) {
  const port = await allocatePort();
  const subdomain = generateSubdomain(userId);
  
  const container = await docker.createContainer({
    Image: 'openclaw:local',
    name: `openclaw-${userId}`,
    Env: [
      `OPENCLAW_GATEWAY_TOKEN=${generateToken()}`,
      `KIMI_CODING_API_KEY=${config.apiKey}`,
      `TELEGRAM_BOT_TOKEN=${config.telegramToken}`,
    ],
    HostConfig: {
      PortBindings: {
        '18789/tcp': [{ HostPort: port.toString() }]
      },
      Binds: [
        `/data/instances/${userId}/config:/home/node/.openclaw`,
        `/data/instances/${userId}/workspace:/home/node/.openclaw/workspace',
      ]
    }
  });
  
  await container.start();
  await setupTailscaleFunnel(subdomain, port);
  
  return { subdomain, port, containerId: container.id };
}
```

### 4. Database Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Instances table
CREATE TABLE instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, running, stopped, error
  subdomain VARCHAR(255) UNIQUE NOT NULL,
  port INTEGER NOT NULL,
  container_id VARCHAR(255),
  model_provider VARCHAR(100), -- kimi-coding, anthropic, openai
  encrypted_api_key TEXT, -- Encrypted at rest
  telegram_bot_token TEXT, -- Encrypted at rest
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50), -- active, canceled, past_due
  plan VARCHAR(50), -- starter, pro, enterprise
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Instance Configuration Generator

```typescript
// Generates openclaw.json for each instance
function generateOpenClawConfig(config: UserConfig): OpenClawConfig {
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
    agents: {
      defaults: {
        model: {
          primary: config.modelProvider
        },
        workspace: "/home/node/.openclaw/workspace",
        maxConcurrent: 4
      }
    },
    gateway: {
      port: 18789,
      mode: "local",
      bind: "lan",
      auth: {
        mode: "password",
        password: generateSecurePassword()
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
```

## Deployment Flow

```
1. User completes web form (model, API key, Telegram token)
        ↓
2. Backend validates and encrypts sensitive data
        ↓
3. Orchestrator creates Docker container
   - Generates unique port
   - Creates config files
   - Mounts volumes
   - Starts container
        ↓
4. Tailscale Funnel setup
   - Assigns subdomain: user-xyz.tailnet.ts.net
   - Configures HTTPS proxy to container port
        ↓
5. Update database with instance details
        ↓
6. Return dashboard URL to user
        ↓
7. User accesses OpenClaw dashboard via public HTTPS URL
```

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14, Tailwind, React |
| Backend API | Node.js, Fastify, TypeScript |
| Database | PostgreSQL (data), Redis (sessions/cache) |
| Orchestration | Docker API or Kubernetes |
| Reverse Proxy | Nginx or Traefik |
| Auth | JWT + bcrypt |
| Payments | Stripe |
| Monitoring | Prometheus + Grafana |
| Logs | Loki or ELK stack |

## Key Differentiators from SimpleClaw

1. **Open Source** - Users can self-host the platform
2. **Customizable** - Full access to OpenClaw configs
3. **Multi-tenant** - Single infrastructure, isolated instances
4. **Extensible** - Plugin system for custom integrations

## MVP Scope

**Phase 1 (Core):**
- Web UI with onboarding wizard
- Single Docker host deployment
- Basic auth + instance creation
- PostgreSQL database

**Phase 2 (Enhance):**
- Stripe billing integration
- Multiple model providers
- Instance monitoring dashboard
- Automated backups

**Phase 3 (Scale):**
- Kubernetes orchestration
- Multi-region deployment
- Enterprise features (SSO, audit logs)
- API access for programmatic control
