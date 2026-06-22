# MaxVideoAI — Self-Hosted Deployment Guide

This guide covers deploying MaxVideoAI on a self-managed Linux server using Docker.

## Architecture

```
Internet → Nginx (80/443) → Next.js (3000) → Cloud Services
                                                ├── Neon Postgres
                                                ├── Supabase Auth
                                                ├── AWS S3
                                                ├── Fal.ai
                                                └── Stripe
           Supercronic (cron) → Next.js API routes
```

Three Docker containers:
- **nextjs** — The Next.js application (standalone mode)
- **nginx** — Reverse proxy with SSL termination (Let's Encrypt)
- **cron** — Scheduled jobs replacing Vercel Cron

---

## 1. Prerequisites

### Server Requirements
- **OS**: Ubuntu 22.04 / 24.04 (or any Linux with Docker support)
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 20GB+ free space
- **Network**: Ports 80 and 443 open to the internet

### Installed Software
- Docker Engine 24+
- Docker Compose Plugin v2+
- Git
- curl (for health checks)

### External Services (keep existing cloud accounts)
- **Neon**: Application Postgres database
- **Supabase**: Authentication only
- **AWS S3**: Media storage
- **Fal.ai**: AI video/image generation
- **Stripe**: Payment processing

### DNS
Domain `video.llmhub.net` must have an A record pointing to the server's public IP.

---

## 2. First-Time Deployment

### 2.1 Clone the Repository

```bash
cd /opt
sudo git clone https://github.com/camgraphe/MaxVideoAi.git maxvideoai
sudo chown -R $USER:$USER /opt/maxvideoai
cd /opt/maxvideoai
git checkout feat/self-hosted-deploy
```

### 2.2 Configure Environment Variables

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Edit `.env.production` and fill in all `[REQUIRED]` variables:

```bash
nano .env.production
```

**Minimum required variables:**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `NEXT_PUBLIC_SITE_URL` | `https://video.llmhub.net` |
| `DATABASE_URL` | Neon Postgres connection string |
| `FAL_KEY` | Fal.ai API key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `S3_BUCKET` | S3 bucket name |
| `S3_REGION` | S3 region |
| `S3_ACCESS_KEY_ID` | S3 access key |
| `S3_SECRET_ACCESS_KEY` | S3 secret key |
| `S3_PUBLIC_BASE_URL` | S3 public URL |
| `HEALTHCHECK_TOKEN` | Random string for health check auth |
| `CRON_SECRET` | Random string for cron job auth |

Generate random tokens:
```bash
# Generate HEALTHCHECK_TOKEN
openssl rand -hex 32

# Generate CRON_SECRET
openssl rand -hex 32
```

### 2.3 Obtain SSL Certificate

Before starting the application, obtain a Let's Encrypt certificate:

```bash
# Ensure port 80 is not in use
sudo lsof -i :80 || true

# Request certificate (standalone mode)
sudo certbot certonly --standalone \
    -d video.llmhub.net \
    --non-interactive \
    --agree-tos \
    -m your-email@example.com

# Verify certificate was created
sudo ls -la /etc/letsencrypt/live/video.llmhub.net/
```

Create the ACME webroot directory for future renewals:
```bash
sudo mkdir -p /var/www/certbot
```

### 2.4 Run Database Migrations

If this is a fresh database, run the Neon migrations:

```bash
# Load environment variables
export $(grep -v '^#' .env.production | xargs)

# Apply migrations (requires psql)
bash scripts/apply-neon-migrations.sh
```

### 2.5 Build and Start

```bash
# Set git SHA for image labeling
export GIT_SHA=$(git rev-parse --short HEAD)

# Build and start all containers
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

This will:
1. Build the Next.js Docker image (~5-10 minutes on first build)
2. Build the cron container
3. Start Next.js, wait for it to become healthy
4. Start Nginx
5. Start the cron scheduler

### 2.6 Verify Deployment

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Run health checks
bash scripts/healthcheck-prod.sh

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

Visit `https://video.llmhub.net` in your browser.

### 2.7 Configure Certificate Auto-Renewal

Let's Encrypt certificates expire every 90 days. Set up auto-renewal:

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Add a post-renewal hook to reload Nginx
sudo bash -c 'cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh << "EOF"
#!/bin/bash
docker compose -f /opt/maxvideoai/docker-compose.prod.yml exec nginx nginx -s reload
EOF'

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

Ubuntu 24.04 includes a systemd timer for certbot that runs twice daily. Verify it's active:

```bash
sudo systemctl status certbot.timer
```

---

## 3. Updating the Deployment

### 3.1 Standard Update (with rebuild)

When code changes require a rebuild (new features, dependency updates, `NEXT_PUBLIC_*` changes):

```bash
cd /opt/maxvideoai
bash scripts/deploy.sh
```

Or manually:

```bash
cd /opt/maxvideoai
git pull origin feat/self-hosted-deploy
export GIT_SHA=$(git rev-parse --short HEAD)

# Rebuild and restart
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Verify
bash scripts/healthcheck-prod.sh
```

### 3.2 Configuration-Only Update

When only server-side environment variables change (no `NEXT_PUBLIC_*` changes):

```bash
# Edit .env.production
nano .env.production

# Restart only the Next.js container (no rebuild needed)
docker compose -f docker-compose.prod.yml restart nextjs

# Wait for health check
sleep 30
bash scripts/healthcheck-prod.sh
```

> **Important**: Changes to `NEXT_PUBLIC_*` variables require a full rebuild because they are inlined into the JavaScript bundle at build time.

### 3.3 Force Clean Rebuild

If you encounter build cache issues:

```bash
bash scripts/deploy.sh --no-cache

# Or manually:
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

---

## 4. Environment Variables Reference

See [`.env.production.example`](../../.env.production.example) for the complete annotated list.

### Build-Time vs Runtime

| Type | Prefix | When Needed | How to Change |
|------|--------|-------------|---------------|
| Build-time | `NEXT_PUBLIC_*` | During `docker build` | Requires full rebuild |
| Runtime | All others | During `docker run` | Restart container only |

### Required Variables Summary

| Variable | Type | Purpose |
|----------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Build | Supabase Auth URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build | Supabase anon key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Build | Stripe client key |
| `NEXT_PUBLIC_SITE_URL` | Build | Canonical site URL |
| `DATABASE_URL` | Runtime | Neon Postgres |
| `FAL_KEY` | Runtime | Fal.ai API |
| `STRIPE_SECRET_KEY` | Runtime | Stripe server |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime | Supabase service role |
| `S3_BUCKET` | Runtime | Media storage bucket |
| `S3_REGION` | Runtime | S3 region |
| `S3_ACCESS_KEY_ID` | Runtime | S3 credentials |
| `S3_SECRET_ACCESS_KEY` | Runtime | S3 credentials |
| `S3_PUBLIC_BASE_URL` | Runtime | S3 public URL |
| `HEALTHCHECK_TOKEN` | Runtime | Health endpoint auth |
| `CRON_SECRET` | Runtime | Cron job auth |

---

## 5. Cron Jobs

The following scheduled jobs replace Vercel's built-in cron (defined in `frontend/vercel.json`):

| Job | Schedule | Purpose |
|-----|----------|---------|
| fal-poll | Every 5 min | Poll Fal.ai async task status |
| byteplus-poll | Every 5 min | Poll BytePlus task status |
| kling-direct-poll | Every 5 min | Poll Kling direct tasks |
| google-vertex-veo-poll | Every 5 min | Poll Google Vertex Veo tasks |
| luma-agents-poll | Every 5 min | Poll Luma Agents tasks |
| reconcile-missing-jobs | Every 10 min | Reconcile orphaned jobs and issue refunds |
| background-removal-retention | Daily 03:37 UTC | Clean up expired background removal assets |
| infra-costs-alert | Daily 08:00 UTC | Send infrastructure cost alerts |

### Verifying Cron Jobs

```bash
# Check cron container logs
docker compose -f docker-compose.prod.yml logs cron

# Manually trigger a cron job
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
    http://localhost:3000/api/cron/fal-poll

# Check last execution times in cron logs
docker compose -f docker-compose.prod.yml logs cron --since 1h
```

---

## 6. Troubleshooting

### Image Build Fails

**Out of memory during build:**
```bash
# Check available memory
free -h

# Increase Docker memory limit or add swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**`NEXT_PUBLIC_*` not passed to build:**
```bash
# Verify vars are in .env.production
grep NEXT_PUBLIC .env.production

# Verify compose reads them
docker compose -f docker-compose.prod.yml --env-file .env.production config | grep NEXT_PUBLIC
```

### Container Won't Start

**DATABASE_URL connection failure:**
```bash
# Test connectivity from inside the container
docker compose -f docker-compose.prod.yml exec nextjs \
    node -e "const { Client } = require('pg'); const c = new Client(process.env.DATABASE_URL); c.connect().then(() => { console.log('OK'); c.end(); }).catch(e => console.error(e));"
```

**Check if required env vars are set:**
```bash
docker compose -f docker-compose.prod.yml exec nextjs env | sort
```

### Nginx 502 Bad Gateway

This means Nginx can't reach the Next.js container:

```bash
# Check if nextjs container is running and healthy
docker compose -f docker-compose.prod.yml ps nextjs

# Check Next.js logs
docker compose -f docker-compose.prod.yml logs nextjs --tail 50

# Test from inside nginx container
docker compose -f docker-compose.prod.yml exec nginx wget -qO- http://nextjs:3000/api/health/env
```

### Cron Jobs Not Executing

```bash
# Check cron container is running
docker compose -f docker-compose.prod.yml ps cron

# Check cron logs for errors
docker compose -f docker-compose.prod.yml logs cron --tail 50

# Manually test the cron curl
docker compose -f docker-compose.prod.yml exec cron \
    sh -c 'curl -sf -H "Authorization: Bearer $CRON_SECRET" http://nextjs:3000/api/cron/fal-poll'
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Reload Nginx after renewal
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

---

## 7. Backup & Recovery

### What Needs Backup

| Component | Managed By | Backup Strategy |
|-----------|-----------|-----------------|
| Database (Neon) | Neon platform | Automatic point-in-time recovery |
| Media files (S3) | AWS | S3 versioning / cross-region replication |
| Auth data (Supabase) | Supabase platform | Automatic backups |
| `.env.production` | You | Manual backup to secure location |

### Backing Up Environment Config

```bash
# Encrypt and backup .env.production
gpg -c .env.production
# Store .env.production.gpg in a secure location (not in git)
```

### Server Recovery

If the server is lost, recovery is straightforward because all data is in cloud services:

1. Provision a new Ubuntu server
2. Install Docker
3. Clone the repo
4. Copy `.env.production` from backup
5. Obtain new SSL cert: `sudo certbot certonly --standalone -d video.llmhub.net`
6. Run `bash scripts/deploy.sh`

---

## 8. Security Checklist

- [ ] `.env.production` file permissions are `600` (owner read/write only)
- [ ] `.env.production` is NOT committed to git
- [ ] `HEALTHCHECK_TOKEN` and `CRON_SECRET` are set to random values
- [ ] Firewall allows only ports 22 (SSH), 80, and 443
- [ ] Docker containers run as non-root users
- [ ] `server_tokens off` in Nginx (hides version)
- [ ] HSTS header enabled (included in nginx.conf)
- [ ] Certbot auto-renewal is active (`systemctl status certbot.timer`)

### Firewall Setup (if not configured)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (for ACME + redirect)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

### Keep Base Images Updated

```bash
# Pull latest base images (security patches)
docker compose -f docker-compose.prod.yml pull nginx
docker pull node:20-slim

# Rebuild with updated base images
bash scripts/deploy.sh --no-cache
```

---

## 9. Useful Commands

```bash
# View all container logs
docker compose -f docker-compose.prod.yml logs -f

# View specific container logs
docker compose -f docker-compose.prod.yml logs nextjs --tail 100

# Restart a specific container
docker compose -f docker-compose.prod.yml restart nextjs

# Stop all containers
docker compose -f docker-compose.prod.yml down

# Stop and remove all data (containers + networks)
docker compose -f docker-compose.prod.yml down -v

# Enter a container shell
docker compose -f docker-compose.prod.yml exec nextjs sh
docker compose -f docker-compose.prod.yml exec nginx sh

# Check resource usage
docker stats

# Prune unused Docker resources (free disk space)
docker system prune -a --volumes
```
