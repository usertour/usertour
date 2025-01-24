#!/bin/sh

# Replace NEST_SERVER_PORT in nginx config
sed -i "s/\${NEST_SERVER_PORT}/$NEST_SERVER_PORT/g" /etc/nginx/conf.d/default.conf

# Start nginx
nginx

# Run database migrations
pnpm prisma migrate deploy

# Seed database
pnpm prisma db seed

# Start Node.js server
node dist/main 
