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

# Run database migrations
pnpm prisma migrate deploy

# Seed database
pnpm prisma db seed

# Start Node.js server
node dist/main 
