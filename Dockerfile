# Use official Deno Docker image
FROM denoland/deno:alpine-2.1.4

# Set working directory
WORKDIR /app

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Copy dependency files first for better caching
COPY deno.json deno.lock ./

# Cache dependencies
RUN deno cache --reload --lock=deno.lock deno.json || true

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Create non-root user for security
RUN addgroup -g 1001 -S deno && \
    adduser -S -u 1001 -G deno deno && \
    chown -R deno:deno /app

# Switch to non-root user
USER deno

# Pre-cache the main module and dependencies
RUN deno cache src/main.ts src/health-server.ts

# Create a startup script
RUN echo '#!/bin/sh\n\
deno run --allow-net --allow-env --allow-read --allow-write src/health-server.ts &\n\
exec deno run --allow-net --allow-env --allow-read --allow-write src/main.ts' > /app/start.sh && \
    chmod +x /app/start.sh

# Health check using the health server
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ping || exit 1

# Run both the health server and the bot
CMD ["/app/start.sh"]