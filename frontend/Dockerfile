# ==============================================================================
# MaxVideoAI — Next.js Production Dockerfile (multi-stage)
#
# Build context: repository root (not frontend/)
# Usage:
#   docker build -f frontend/Dockerfile \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://video.llmhub.net \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
#     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
#     --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=... \
#     -t maxvideoai:latest .
# ==============================================================================

# ---------------------------------------------------------------------------
# Stage 1: base — install pnpm via corepack
# ---------------------------------------------------------------------------
FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

# ---------------------------------------------------------------------------
# Stage 2: deps — install production + dev dependencies
# ---------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

# Install build tools needed by native addons (bufferutil, sharp fallback)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace config and lockfile first (for layer caching)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY frontend/package.json frontend/package.json
COPY packages/pricing/package.json packages/pricing/package.json

# Install all workspace dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 3: builder — build Next.js application
# ---------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

# Copy installed dependencies from deps stage
COPY --from=deps /app/ ./

# Copy all source files
COPY . .

# ---- NEXT_PUBLIC_* build-time arguments ----
# These are inlined into the JS bundle at build time.
# They MUST be provided as --build-arg during `docker build`.
ARG NEXT_PUBLIC_API_BASE=/api
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_ASSET_UPLOAD_TARGET_MB=4
ARG NEXT_PUBLIC_LEGAL_MIN_AGE=15
ARG NEXT_PUBLIC_GOOGLE_CONSENT_MODE=auto
ARG NEXT_PUBLIC_GOOGLE_ADS_ID
ARG NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID
ARG NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_CURRENCY
ARG NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
ARG NEXT_PUBLIC_BING_VERIFY
ARG NEXT_PUBLIC_CLARITY_ID
ARG NEXT_PUBLIC_ENABLE_CLARITY=false
ARG NEXT_PUBLIC_CLARITY_ALLOWED_HOSTS
ARG NEXT_PUBLIC_CLARITY_DEBUG=false
ARG NEXT_PUBLIC_ENABLE_SEARCH_SCHEMA=false
ARG NEXT_PUBLIC_WORKSPACE_CENTER_GALLERY=false

# Propagate ARGs to ENV so Next.js can read them during build
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_ASSET_UPLOAD_TARGET_MB=$NEXT_PUBLIC_ASSET_UPLOAD_TARGET_MB
ENV NEXT_PUBLIC_LEGAL_MIN_AGE=$NEXT_PUBLIC_LEGAL_MIN_AGE
ENV NEXT_PUBLIC_GOOGLE_CONSENT_MODE=$NEXT_PUBLIC_GOOGLE_CONSENT_MODE
ENV NEXT_PUBLIC_GOOGLE_ADS_ID=$NEXT_PUBLIC_GOOGLE_ADS_ID
ENV NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID=$NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID
ENV NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_CURRENCY=$NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_CURRENCY
ENV NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=$NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
ENV NEXT_PUBLIC_BING_VERIFY=$NEXT_PUBLIC_BING_VERIFY
ENV NEXT_PUBLIC_CLARITY_ID=$NEXT_PUBLIC_CLARITY_ID
ENV NEXT_PUBLIC_ENABLE_CLARITY=$NEXT_PUBLIC_ENABLE_CLARITY
ENV NEXT_PUBLIC_CLARITY_ALLOWED_HOSTS=$NEXT_PUBLIC_CLARITY_ALLOWED_HOSTS
ENV NEXT_PUBLIC_CLARITY_DEBUG=$NEXT_PUBLIC_CLARITY_DEBUG
ENV NEXT_PUBLIC_ENABLE_SEARCH_SCHEMA=$NEXT_PUBLIC_ENABLE_SEARCH_SCHEMA
ENV NEXT_PUBLIC_WORKSPACE_CENTER_GALLERY=$NEXT_PUBLIC_WORKSPACE_CENTER_GALLERY

# Git SHA label for traceability
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA

# Build Next.js (standalone output goes to frontend/.next/standalone/)
# NEXT_TELEMETRY_DISABLED prevents sending telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/frontend
RUN pnpm build

# ---------------------------------------------------------------------------
# Stage 4: runner — minimal production image
# ---------------------------------------------------------------------------
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy standalone build output (includes minimal node_modules + server.js)
# outputFileTracingRoot = repo root, so standalone includes the full tree
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./

# Copy static assets (not included in standalone by default)
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static

# Copy public assets
COPY --from=builder --chown=nextjs:nodejs /app/frontend/public ./frontend/public

# Labels for traceability
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.source="https://github.com/camgraphe/MaxVideoAi"
LABEL org.opencontainers.image.revision="${GIT_SHA}"
LABEL org.opencontainers.image.title="MaxVideoAI"

# Switch to non-root user
USER nextjs

WORKDIR /app/frontend

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: 3000, path: '/api/health/env', timeout: 5000, headers: process.env.HEALTHCHECK_TOKEN ? { 'x-healthcheck-token': process.env.HEALTHCHECK_TOKEN } : {} }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.on('timeout', () => { req.destroy(); process.exit(1); }); req.end();"

CMD ["node", "server.js"]
