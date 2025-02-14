import type { Config } from './config.interface';

const config: Config = {
  nest: {
    port: process.env.NEST_SERVER_PORT ? Number.parseInt(process.env.NEST_SERVER_PORT) : 3000,
  },
  cors: {
    enabled: true,
  },
  swagger: {
    enabled: true,
    title: 'Nestjs FTW',
    description: 'The nestjs API description',
    version: '1.5',
    path: 'api',
  },
  graphql: {
    playgroundEnabled: true,
    debug: true,
    schemaDestination: './src/schema.graphql',
    sortSchema: true,
  },
  security: {
    expiresIn: '7d',
    refreshIn: '7d',
    bcryptSaltOrRound: 10,
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  },
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number.parseInt(process.env.DB_PORT) : 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    schema: process.env.DB_SCHEMA,
    url: process.env.DATABASE_URL,
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT ? Number.parseInt(process.env.EMAIL_PORT) : 465,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  redis: {
    host: process.env.Redis_HOST,
    port: process.env.Redis_PORT ? Number.parseInt(process.env.Redis_PORT) : 6379,
    password: process.env.Redis_PASS,
  },
  app: {
    homepageUrl: process.env.APP_HOMEPAGE_URL,
  },
  aws: {
    s3: {
      region: process.env.AWS_S3_REGION,
      endpoint: process.env.AWS_S3_ENDPOINT,
      accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
      bucket: process.env.AWS_S3_BUCKET,
      domain: process.env.AWS_S3_DOMAIN,
    },
  },
  auth: {
    github: {
      enabled: process.env.GITHUB_AUTH_ENABLED === 'true',
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl: process.env.GITHUB_CALLBACK_URL,
    },
    google: {
      enabled: process.env.GOOGLE_AUTH_ENABLED === 'true',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
  },
};

export default (): Config => config;
