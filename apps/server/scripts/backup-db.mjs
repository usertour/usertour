import { createReadStream, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return expandEnvValue(value);
}

function expandEnvValue(value, seen = new Set()) {
  return value.replace(/\$\{([A-Z0-9_]+)\}/gi, (_, name) => {
    if (seen.has(name)) {
      throw new Error(`Circular environment variable reference detected: ${name}`);
    }

    const replacement = process.env[name];
    if (replacement == null) {
      throw new Error(`Missing environment variable referenced by expansion: ${name}`);
    }

    seen.add(name);
    const expanded = expandEnvValue(replacement, seen);
    seen.delete(name);
    return expanded;
  });
}

function buildTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');
}

function buildObjectKey(prefix, filePrefix, timestamp) {
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
  const filename = `${filePrefix}_${timestamp}.dump`;

  return normalizedPrefix ? `${normalizedPrefix}/${filename}` : filename;
}

async function runPgDump(outputPath, databaseUrl) {
  await new Promise((resolve, reject) => {
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
      {
        stdio: 'inherit',
        env: process.env,
      },
    );

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`pg_dump exited with code ${code ?? 'unknown'}`));
    });
  });
}

async function uploadBackup(filePath, key, config) {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint || undefined,
    forcePathStyle: process.env.BACKUP_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: createReadStream(filePath),
    ContentType: 'application/octet-stream',
    Metadata: {
      source: 'postgres',
      created_at: new Date().toISOString(),
    },
    ServerSideEncryption: process.env.BACKUP_SERVER_SIDE_ENCRYPTION || undefined,
  });

  await client.send(command);
}

async function main() {
  const databaseUrl = process.env.DATABASE_DIRECT_URL
    ? expandEnvValue(process.env.DATABASE_DIRECT_URL)
    : process.env.DATABASE_URL
      ? expandEnvValue(process.env.DATABASE_URL)
      : undefined;
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_DIRECT_URL or DATABASE_URL');
  }

  if (!process.env.DATABASE_DIRECT_URL && process.env.DATABASE_URL) {
    console.warn(
      'DATABASE_DIRECT_URL is not set; falling back to DATABASE_URL. This may be less reliable if DATABASE_URL points to PgBouncer.',
    );
  }

  const config = {
    bucket: getRequiredEnv('BACKUP_BUCKET'),
    region: process.env.BACKUP_REGION ? expandEnvValue(process.env.BACKUP_REGION) : 'auto',
    endpoint: process.env.BACKUP_ENDPOINT ? expandEnvValue(process.env.BACKUP_ENDPOINT) : undefined,
    accessKeyId: getRequiredEnv('BACKUP_ACCESS_KEY_ID'),
    secretAccessKey: getRequiredEnv('BACKUP_SECRET_ACCESS_KEY'),
    prefix: process.env.BACKUP_PREFIX ? expandEnvValue(process.env.BACKUP_PREFIX) : 'prod/postgres',
    filePrefix: process.env.BACKUP_FILE_PREFIX
      ? expandEnvValue(process.env.BACKUP_FILE_PREFIX)
      : 'postgres',
  };

  const timestamp = buildTimestamp();
  const key = buildObjectKey(config.prefix, config.filePrefix, timestamp);
  const tempFile = path.join(os.tmpdir(), `${config.filePrefix}_${process.pid}_${timestamp}.dump`);

  console.log(`Starting PostgreSQL backup to s3://${config.bucket}/${key}`);

  try {
    await runPgDump(tempFile, databaseUrl);
    console.log(`pg_dump completed: ${tempFile}`);

    await uploadBackup(tempFile, key, config);
    console.log(`Backup uploaded successfully: s3://${config.bucket}/${key}`);
  } finally {
    await fs.rm(tempFile, { force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
