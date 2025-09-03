FROM denoland/deno:alpine-2.4.5

WORKDIR /app
RUN mkdir -p /app/data && chown -R deno:deno /app

COPY --chown=deno:deno . .
USER deno

RUN deno cache --reload deno.json || true

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD deno run --allow-net --quiet -e "fetch('http://localhost:3001/ping').catch(() => Deno.exit(1))"

CMD ["deno", "task", "dev"]