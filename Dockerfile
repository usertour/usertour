# Build stage
#
# Debian (glibc), not Alpine (musl): the Prisma query engine is a
# multi-threaded native binary, and under a reconnect burst its four worker
# threads cost about five times more CPU on musl's allocator than on glibc's,
# enough to saturate a 4 vCPU replica on their own. Same major as the LTS line
# in use, release and distribution named so a rebuild never moves to another
# Node minor or Debian release on its own.
FROM node:22.23-trixie-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@9.6.0

# Copy all files (filtered by .dockerignore)
COPY . .

# Generate config.js for web
RUN echo "window.ENV = {" > ./apps/web/public/config.js && \
    grep -E '^[[:space:]]*VITE_' ./apps/web/.env.example | while read line; do \
        var_name=$(echo $line | cut -d'=' -f1 | tr -d ' ' | sed 's/VITE_//'); \
        echo "  $var_name: '\$$var_name'," >> ./apps/web/public/config.js; \
    done && \
    echo "};" >> ./apps/web/public/config.js

# Copy SDK env
COPY apps/sdk/.env.example ./apps/sdk/.env

# Install dependencies
RUN pnpm install

# Build all apps
RUN pnpm build:server
RUN pnpm build:web
RUN pnpm build:sdk
RUN pnpm build:sdk:iife

# Copy SDK files to a known location
RUN SDK_VERSION=$(node -e "console.log(require('./apps/sdk/package.json').version)") && \
    mkdir -p /sdk-dist && \
    cp -r apps/sdk/dist/$SDK_VERSION/* /sdk-dist/

# Production stage
FROM node:22.23-trixie-slim

WORKDIR /app

# Install pnpm and system dependencies. gettext-base provides envsubst for
# start.sh; postgresql-client provides pg_dump for the backup script.
RUN npm install -g pnpm@9.6.0 && \
    apt-get update && \
    apt-get install -y --no-install-recommends nginx openssl ca-certificates gettext-base postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy web/sdk static files
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html/web
COPY --from=builder /app/apps/sdk/dist /usr/share/nginx/html/sdk
COPY --from=builder /sdk-dist /usr/share/nginx/html/sdk

# Copy server with workspace structure
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma

# Create nginx cache directory
RUN mkdir -p /var/cache/nginx

# Copy scripts
COPY scripts/start.sh ./scripts/start.sh
COPY apps/server/scripts/backup-db.mjs ./apps/server/scripts/backup-db.mjs
RUN chmod +x ./scripts/start.sh

# Environment variables
ENV NODE_ENV=production
ENV PORT=80
ENV NEST_SERVER_PORT=3000

EXPOSE 80

# Exec (JSON) form: no `sh -c` wrapper, so the signal chain reaches the app —
# start.sh ends with `exec node`, making Node PID 1; Nest's shutdown hooks
# (main.ts enableShutdownHooks) then handle SIGTERM and `docker stop` is
# graceful instead of a 10s timeout + SIGKILL. (Shell vs exec form has no
# effect on stdout/stderr — both inherit the same pipes; the old "log
# flushing" rationale for shell form was a misattribution.)
CMD ["/app/scripts/start.sh"]
