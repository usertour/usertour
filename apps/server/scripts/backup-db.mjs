import { createReadStream, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ============================================================================
// Environment helpers
// ============================================================================

function expandEnvValue(value, seen = new Set()) {
  return value.replace(/\$\{([A-Z0-9_]+)\}/gi, (_, name) => {
    if (seen.has(name)) {
      throw new Error(`Circular environment variable reference: ${name}`);
    }
    const raw = process.env[name];
    if (raw == null) {
      throw new Error(`Undefined environment variable in expansion: ${name}`);
    }
    seen.add(name);
    const expanded = expandEnvValue(raw, seen);
    seen.delete(name);
    return expanded;
  });
}

function getEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null) {
    if (fallback === undefined) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return fallback;
  }
  return expandEnvValue(raw);
}

// ============================================================================
// Config
// ============================================================================

function loadConfig() {
  const databaseUrl = process.env.DATABASE_DIRECT_URL
    ? getEnv('DATABASE_DIRECT_URL')
    : getEnv('DATABASE_URL');

  if (!process.env.DATABASE_DIRECT_URL && process.env.DATABASE_URL) {
    console.warn(
      'DATABASE_DIRECT_URL is not set; falling back to DATABASE_URL. This may be unreliable if it points to PgBouncer.',
    );
  }

  return {
    databaseUrl,
    bucket: getEnv('BACKUP_BUCKET'),
    region: getEnv('BACKUP_REGION', 'auto'),
    endpoint: getEnv('BACKUP_ENDPOINT', null),
    accessKeyId: getEnv('BACKUP_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('BACKUP_SECRET_ACCESS_KEY'),
    prefix: getEnv('BACKUP_PREFIX', 'prod/postgres'),
    filePrefix: getEnv('BACKUP_FILE_PREFIX', 'postgres'),
    forcePathStyle: getEnv('BACKUP_FORCE_PATH_STYLE', null) === 'true',
    serverSideEncryption: getEnv('BACKUP_SERVER_SIDE_ENCRYPTION', null),
  };
}

// ============================================================================
// Backup steps
// ============================================================================

function buildObjectKey(prefix, filePrefix, timestamp) {
  const normalized = prefix.replace(/^\/+|\/+$/g, '');
  const filename = `${filePrefix}_${timestamp}.dump`;
  return normalized ? `${normalized}/${filename}` : filename;
}

function runPgDump(outputPath, databaseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'pg_dump',
      [
        `--dbname=${databaseUrl}`,
        '--format=custom',
        '--compress=9',
        '--no-owner',
        '--no-privileges',
        `--file=${outputPath}`,
      ],
      { stdio: 'inherit', env: process.env },
    );

    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`pg_dump exited with code ${code ?? 'unknown'}`)),
    );
  });
}

async function uploadToS3(filePath, key, config) {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint || undefined,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: createReadStream(filePath),
      ContentType: 'application/octet-stream',
      Metadata: { source: 'postgres', created_at: new Date().toISOString() },
      ServerSideEncryption: config.serverSideEncryption || undefined,
    }),
  );
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const config = loadConfig();
  const timestamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');
  const key = buildObjectKey(config.prefix, config.filePrefix, timestamp);
  const tempFile = path.join(os.tmpdir(), `${config.filePrefix}_${process.pid}_${timestamp}.dump`);

  console.log(`Starting backup → s3://${config.bucket}/${key}`);

  try {
    await runPgDump(tempFile, config.databaseUrl);

    const { size } = await fs.stat(tempFile);
    console.log(`pg_dump completed (${(size / 1024 / 1024).toFixed(1)} MB)`);

    await uploadToS3(tempFile, key, config);
    console.log(`Backup uploaded successfully: s3://${config.bucket}/${key}`);
  } finally {
    await fs.rm(tempFile, { force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
