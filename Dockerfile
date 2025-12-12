# Build stage for server
FROM node:22.13-alpine AS server-builder

WORKDIR /app

# Install OpenSSL 3.0 for Prisma to detect correct version
RUN apk add --no-cache openssl openssl-dev

# Set npm registry and install pnpm
RUN npm install -g pnpm

# Copy server files directly
COPY apps/server ./

RUN pnpm install --ignore-scripts
RUN pnpm build

# Copy email templates after build
COPY apps/server/src/email-templates ./dist/email-templates

# Build stage for web and sdk
FROM node:22.13-alpine AS web-builder

WORKDIR /app

RUN npm install -g pnpm

# Copy package files and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY apps/web ./apps/web
COPY apps/sdk ./apps/sdk
COPY apps/sdk/.env.example ./apps/sdk/.env
COPY packages ./packages


# Generate config.js dynamically from .env.example
# This will overwrite the existing config.js file
RUN echo "window.ENV = {" > ./apps/web/public/config.js && \
    cat ./apps/web/.env.example | while read line; do \
    if [ ! -z "$line" ]; then \
        var_name=$(echo $line | cut -d'=' -f1 | tr -d ' ' | sed 's/VITE_//'); \
        echo "  $var_name: '\$$var_name'," >> ./apps/web/public/config.js; \
    fi \
    done && \
    echo "};" >> ./apps/web/public/config.js

RUN pnpm install 
RUN pnpm --filter @usertour/web build
RUN pnpm --filter @usertour/sdk build
RUN pnpm --filter @usertour/sdk build:iife

# Copy SDK files to a known location
RUN SDK_VERSION=$(node -e "console.log(require('./apps/sdk/package.json').version)") && \
    mkdir -p /sdk-dist && \
    cp -r apps/sdk/dist/$SDK_VERSION/* /sdk-dist/

# Production stage
FROM node:22.13-alpine

WORKDIR /app

# Set npm registry and install base tools
RUN npm install -g pnpm

# Install system dependencies (netcat-openbsd for wait-for script)
RUN apk add --no-cache nginx openssl openssl-dev libc6-compat gettext netcat-openbsd

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built artifacts from both builders
COPY --from=web-builder /app/apps/web/dist /usr/share/nginx/html/web
COPY --from=web-builder /app/apps/sdk/dist /usr/share/nginx/html/sdk
COPY --from=web-builder /sdk-dist /usr/share/nginx/html/sdk

COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=server-builder /app/dist ./dist
COPY --from=server-builder /app/package.json ./package.json
COPY --from=server-builder /app/prisma ./prisma

# Create nginx cache directory
RUN mkdir -p /var/cache/nginx

# Copy scripts
COPY scripts/start.sh ./scripts/start.sh
COPY scripts/wait-for ./scripts/wait-for
COPY scripts/parse-db-url.js ./scripts/parse-db-url.js
RUN chmod +x ./scripts/start.sh ./scripts/wait-for

# Default environment variables
ENV NODE_ENV=production
ENV PORT=80
ENV NEST_SERVER_PORT=3000

EXPOSE 80

CMD ["/app/scripts/start.sh"] 