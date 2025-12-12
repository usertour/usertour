#!/usr/bin/env node

/**
 * Parse database URL and output host:port
 * Reads from DATABASE_DIRECT_URL or DATABASE_URL environment variable
 */

const url = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;

if (!url) {
  console.error('ERROR: DATABASE_URL is not set');
  process.exit(1);
}

try {
  const parsed = new URL(url);
  const host = parsed.hostname;
  const port = parsed.port || 5432;

  if (!host) {
    console.error('ERROR: Invalid DATABASE_URL - hostname is empty');
    process.exit(1);
  }

  console.log(`${host}:${port}`);
} catch (error) {
  console.error(`ERROR: Invalid DATABASE_URL - ${error.message}`);
  process.exit(1);
}
