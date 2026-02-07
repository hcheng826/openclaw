---
name: openclaw-tailscale-funnel
description: Set up OpenClaw Gateway with Tailscale Funnel for secure public HTTPS access to the dashboard. Use when: (1) Deploying OpenClaw on a remote server/VPS, (2) Needing public access to the OpenClaw Control UI/dashboard, (3) Setting up secure remote management of OpenClaw, (4) Configuring password-protected or token-based dashboard access over HTTPS. Covers Tailscale installation, authentication, Funnel configuration, OpenClaw gateway settings, and device pairing.
---

# OpenClaw + Tailscale Funnel Setup

Complete setup for publicly accessible OpenClaw dashboard via Tailscale Funnel with password authentication.

## Prerequisites

- Ubuntu/Debian server (or similar Linux)
- OpenClaw installed (`npm install -g openclaw`)
- Root/sudo access for Tailscale installation

## Overview

This setup provides:
- Public HTTPS URL for OpenClaw dashboard
- Password-protected access
- Token-based WebSocket authentication
- No need for VPN/Tailscale on client devices

## Step-by-Step Setup

### 1. Install and Authenticate Tailscale

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale (you'll get a login URL)
sudo tailscale up
```

**User action required:** Open the provided URL and authenticate with your Tailscale account.

### 2. Verify Tailscale Connection

```bash
# Check status
tailscale status

# Get Tailscale IP
tailscale ip -4
```

### 3. Configure OpenClaw Gateway

Edit `~/.openclaw/openclaw.json`:

```json
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "loopback",
    "auth": {
      "mode": "password",
      "password": "YOUR_SECURE_PASSWORD"
    },
    "tailscale": {
      "mode": "funnel",
      "resetOnExit": false
    }
  }
}
```

### 4. Start Tailscale Funnel

```bash
# Start funnel (keeps running in foreground)
sudo tailscale funnel --https=443 --set-path=/ http://127.0.0.1:18789
```

For background operation, use systemd or screen/tmux.

### 5. Start OpenClaw Gateway

```bash
# Start the gateway service
openclaw gateway start

# Or run in foreground for debugging
openclaw gateway --verbose
```

### 6. Approve Device Pairing

When you first access the dashboard, you'll see "pairing required":

```bash
# List pending pairings
openclaw devices list

# Approve the pairing request
openclaw devices approve <request-id>
```

## Accessing the Dashboard

Once configured:

1. **Public URL:** `https://<your-machine>.<tailnet-name>.ts.net/`
2. **Password:** The password set in config
3. **Token:** If needed, get it from `~/.openclaw/openclaw.json`

## Troubleshooting

### "Access denied: serve config denied"
Run with sudo: `sudo tailscale funnel ...`

### "pairing required" error
Run `openclaw devices list` and `openclaw devices approve <id>`

### Funnel not working
Ensure Funnel is enabled in Tailscale admin console:
- Go to https://login.tailscale.com/admin
- Check your machine has Funnel attribute

### Cannot reach URL
- Verify Tailscale is running: `tailscale status`
- Check OpenClaw gateway: `openclaw gateway status`
- Ensure firewall allows outbound HTTPS

## Security Notes

- Keep your password strong and unique
- Token is stored in plaintext in config
- Funnel exposes the dashboard to the public internet
- Consider IP allowlisting in Tailscale ACLs for additional security

## Alternative: Tailscale Serve (Tailnet-only)

For private access (requires Tailscale on client):

```bash
# Use serve instead of funnel
sudo tailscale serve --https=443 --set-path=/ http://127.0.0.1:18789
```

URL will be the same but only accessible from devices on your tailnet.
