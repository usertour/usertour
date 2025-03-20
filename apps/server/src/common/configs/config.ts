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
    cookieDomain: process.env.USERTOUR_COOKIE_DOMAIN,
    redirectUrl: process.env.LOGIN_REDIRECT_URL || '/env/1/flows',
    email: {
      enabled: process.env.EMAIL_AUTH_ENABLED === 'true' || true,
      sender: process.env.EMAIL_SENDER || 'UserTour <support@usertour.io>',
      resendApiKey: process.env.RESEND_API_KEY,
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'test',
      expiresIn: process.env.JWT_EXPIRATION_TIME || '1h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME || '7d',
    },
    github: {
      enabled: process.env.GITHUB_AUTH_ENABLED === 'true' || false,
      clientId: process.env.GITHUB_CLIENT_ID || 'test',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'test',
      callbackUrl: process.env.GITHUB_CALLBACK_URL || 'test',
    },
    google: {
      enabled: process.env.GOOGLE_AUTH_ENABLED === 'true' || false,
      clientId: process.env.GOOGLE_CLIENT_ID || 'test',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'test',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'test',
    },
  },
};

export default (): Config => config;
