#!/bin/sh

# Replace environment variables in config.js
envsubst < /usr/share/nginx/html/web/config.js > /usr/share/nginx/html/web/config.js.tmp
mv /usr/share/nginx/html/web/config.js.tmp /usr/share/nginx/html/web/config.js

# Set default values for ports
NGINX_PORT=${PORT:-80}
NEST_SERVER_PORT=${NEST_SERVER_PORT:-3000}

# Check for port conflict
if [ "$NGINX_PORT" = "$NEST_SERVER_PORT" ]; then
    echo "ERROR: PORT ($NGINX_PORT) and NEST_SERVER_PORT ($NEST_SERVER_PORT) cannot be the same!"
    echo "Please set different values for these environment variables."
    exit 1
fi

# Print current ports
echo "Using ports: NGINX_PORT=$NGINX_PORT, NEST_SERVER_PORT=$NEST_SERVER_PORT"

# Replace ports in nginx config
sed -i "s/\${NGINX_PORT}/$NGINX_PORT/g" /etc/nginx/conf.d/default.conf
sed -i "s/\${NEST_SERVER_PORT}/$NEST_SERVER_PORT/g" /etc/nginx/conf.d/default.conf

# Start nginx
nginx

# Change to server directory for prisma commands
cd /app/apps/server

# Run database migrations with retry
MAX_RETRIES=${DB_MIGRATE_RETRIES:-3}
RETRY_INTERVAL=3

for i in $(seq 1 $MAX_RETRIES); do
    echo "Attempting database migration (attempt $i/$MAX_RETRIES)..."
    # Use npx to execute prisma from local node_modules
    # npx will find prisma in ./node_modules/.bin/prisma
    if npx prisma migrate deploy --preview-feature; then
        echo "Database migration completed successfully!"
        break
    fi
    if [ $i -eq $MAX_RETRIES ]; then
        echo "ERROR: Database migration failed after $MAX_RETRIES attempts"
        exit 1
    fi
    echo "Migration failed, retrying in $RETRY_INTERVAL seconds..."
    sleep $RETRY_INTERVAL
done

# Seed database
npx prisma db seed

# Start Node.js server
node dist/main
