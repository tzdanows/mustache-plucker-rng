FROM denoland/deno:alpine-2.4.5

WORKDIR /app

# Copy application files (data/ is excluded by .dockerignore)
COPY --chown=deno:deno . .

# As root, create directories with proper permissions
RUN mkdir -p /app/data /app/node_modules && \
    chown -R deno:deno /app && \
    chmod 755 /app && \
    chmod 777 /app/data /app/node_modules

# Switch to deno user for running the app
USER deno

# Cache dependencies as deno user
RUN deno cache --reload src/deps.ts || true

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD deno run --allow-net --quiet -e "fetch('http://localhost:3001/ping').catch(() => Deno.exit(1))"

CMD ["deno", "task", "start"]