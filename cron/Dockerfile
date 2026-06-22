# ==============================================================================
# MaxVideoAI — Cron Container (Supercronic)
#
# Lightweight Alpine container that runs scheduled HTTP calls to the
# Next.js API routes, replacing Vercel's built-in cron.
# ==============================================================================

FROM alpine:3.20

# Install curl for HTTP calls
RUN apk add --no-cache curl

# Install supercronic (cron daemon designed for containers)
# Using a specific release for reproducibility
ARG SUPERCRONIC_VERSION=v0.2.33
ARG SUPERCRONIC_ARCH=linux-amd64
ARG SUPERCRONIC_SHA256=71b0d58cc53f6bd72f4571c22864dbf590b8e0dbc87ca3cf94be5ca1a3f58966
RUN wget -q "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-${SUPERCRONIC_ARCH}" \
        -O /usr/local/bin/supercronic \
    && echo "${SUPERCRONIC_SHA256}  /usr/local/bin/supercronic" | sha256sum -c - \
    && chmod +x /usr/local/bin/supercronic

# Copy cron helper script
COPY cron-curl.sh /usr/local/bin/cron-curl.sh
RUN chmod +x /usr/local/bin/cron-curl.sh

# Copy crontab
COPY crontab /etc/crontab

# Run as non-root
RUN adduser -D -u 1001 cronuser
USER cronuser

CMD ["supercronic", "/etc/crontab"]
