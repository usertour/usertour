#!/bin/sh

# Start nginx
nginx

# Run database migrations
pnpm prisma migrate deploy

# Seed database
pnpm prisma db seed

# Start Node.js server
node dist/main 
