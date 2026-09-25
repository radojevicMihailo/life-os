# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Placeholder only: build must never need access to a live database.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build pnpm build
# Scripts execute outside Next's output tracing. Install only their pg dependency.
RUN mkdir /script-deps && cd /script-deps && npm install --omit=dev --ignore-scripts pg@8.21.0

FROM postgres:16-bookworm AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends tini libstdc++6 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 app && useradd --uid 10001 --gid app --no-create-home app
COPY --from=build /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/db ./db
COPY --from=build /script-deps/node_modules ./scripts/node_modules
COPY docker/ /usr/local/lib/life-os/
RUN chmod +x /usr/local/lib/life-os/*.sh
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 \
    PGDATA=/data/postgres NODE_OPTIONS=--max-old-space-size=128
EXPOSE 3000
# The supervisor needs root to initialize volume ownership; both servers drop privileges.
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/lib/life-os/entrypoint.sh"]
