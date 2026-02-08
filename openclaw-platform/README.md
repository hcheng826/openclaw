# OpenClaw Platform - MVP

SimpleClaw-style one-click OpenClaw deployment platform.

## Quick Start

```bash
# Start the platform
docker-compose up -d

# Access
- Web UI: http://localhost:3000
- API: http://localhost:3001
```

## Architecture

- **Frontend**: Next.js 14 (port 3000)
- **Backend**: Fastify API (port 3001)
- **Database**: PostgreSQL (port 5432)
- **Instance Base Port**: 20000+ (for user OpenClaw containers)

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL`
- `TAILSCALE_AUTH_KEY` (optional, for funnel)
- `DOCKER_SOCKET` (path to Docker socket)
