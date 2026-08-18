# Build stage
FROM node:22.13-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev

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

# Copy email templates
COPY apps/server/src/email-templates ./apps/server/dist/email-templates

# Copy SDK files to a known location
RUN SDK_VERSION=$(node -e "console.log(require('./apps/sdk/package.json').version)") && \
    mkdir -p /sdk-dist && \
    cp -r apps/sdk/dist/$SDK_VERSION/* /sdk-dist/

# Production stage
FROM node:22.13-alpine

WORKDIR /app

# Install pnpm and system dependencies
RUN npm install -g pnpm@9.6.0 && \
    apk add --no-cache nginx openssl openssl-dev libc6-compat gettext postgresql16-client

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
