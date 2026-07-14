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
    username: process.env.Redis_USER,
    password: process.env.Redis_PASS,
    tls: process.env.Redis_TLS === 'true',
  },
  app: {
    homepageUrl: process.env.APP_HOMEPAGE_URL || '',
    apiUrl: process.env.API_URL || '',
    docUrl: process.env.DOC_URL || '',
    // The SSO OIDC redirect URI, defined once: override with SSO_CALLBACK_URL,
    // otherwise derived from API_URL (fixed path). Both the openid-client
    // redirect_uri and the value shown to admins (via globalConfig) read this,
    // so the two can't drift.
    ssoCallbackUrl:
      process.env.SSO_CALLBACK_URL || `${process.env.API_URL || ''}/api/auth/sso/callback`,
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
  stripe: {
    apiKey: process.env.STRIPE_API_KEY || 'test',
    webhookSecret: {
      account: process.env.STRIPE_ACCOUNT_WEBHOOK_SECRET || 'test',
      accountTest: process.env.STRIPE_ACCOUNT_TEST_WEBHOOK_SECRET || 'test',
    },
    sessionSuccessUrl: process.env.STRIPE_SESSION_SUCCESS_URL || '',
    sessionCancelUrl: process.env.STRIPE_SESSION_CANCEL_URL || '',
    portalReturnUrl: process.env.STRIPE_PORTAL_RETURN_URL || '',
  },

  auth: {
    cookie: {
      secure: process.env.USERTOUR_COOKIE_SECURE === 'true',
      domain: process.env.USERTOUR_COOKIE_DOMAIN,
    },
    email: {
      enabled: process.env.EMAIL_AUTH_ENABLED === 'true',
      sender: process.env.EMAIL_SENDER || 'UserTour <support@usertour.io>',
      resendApiKey: process.env.RESEND_API_KEY || 'test',
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'test',
      expiresIn: process.env.JWT_EXPIRATION_TIME || '1h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME || '7d',
    },
    github: {
      enabled: process.env.GITHUB_AUTH_ENABLED === 'true',
      clientId: process.env.GITHUB_CLIENT_ID || 'test',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'test',
      callbackUrl:
        process.env.GITHUB_CALLBACK_URL || `${process.env.API_URL || ''}/api/auth/github/callback`,
    },
    google: {
      enabled: process.env.GOOGLE_AUTH_ENABLED === 'true',
      clientId: process.env.GOOGLE_CLIENT_ID || 'test',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'test',
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL || `${process.env.API_URL || ''}/api/auth/google/callback`,
    },
  },
  content: {
    limit: {
      survey: process.env.SURVEY_CONTENT_LIMIT
        ? Number.parseInt(process.env.SURVEY_CONTENT_LIMIT)
        : -1,
    },
  },
  ai: {
    // 'anthropic' (default), 'openai-compatible' (any OpenAI-shaped gateway)
    // or 'bedrock' (AWS). The feature is enabled by setting the API key —
    // except for bedrock, where selecting the provider is the signal: it can
    // authenticate keylessly through the AWS default credential chain.
    provider: process.env.AI_PROVIDER || 'anthropic',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'claude-opus-4-8',
    baseUrl: process.env.AI_BASE_URL || '',
    // bedrock only. Region falls back to AWS_REGION; credentials fall back
    // to the AWS default chain (env vars, profile, instance role).
    awsRegion: process.env.AI_AWS_REGION || '',
    awsAccessKeyId: process.env.AI_AWS_ACCESS_KEY_ID || '',
    awsSecretAccessKey: process.env.AI_AWS_SECRET_ACCESS_KEY || '',
  },
  globalConfig: {
    isSelfHostedMode: process.env.IS_SELF_HOSTED_MODE !== 'false',
    // Whether the server may make outbound requests to private / internal
    // addresses. Secure by default (false → public targets only), independent
    // of the deployment mode. A deployment whose IdP / webhook target lives on
    // an internal network must opt in explicitly with
    // ALLOW_PRIVATE_NETWORK_EGRESS=true.
    allowPrivateNetworkEgress: process.env.ALLOW_PRIVATE_NETWORK_EGRESS === 'true',
  },
  integration: {
    salesforce: {
      clientId: process.env.SALESFORCE_CLIENT_ID || '',
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
      callbackUrl: process.env.SALESFORCE_CALLBACK_URL || '',
      loginUrl: process.env.SALESFORCE_LOGIN_URL || '',
      sandboxLoginUrl: process.env.SALESFORCE_SANDBOX_LOGIN_URL || 'https://test.salesforce.com',
    },
  },
  encryption: {
    // 64-hex-char (32-byte) AES-256 key. Override `ENCRYPTION_KEY` in
    // production — the all-zero default is a sentinel for local dev
    // and is intentionally weak so accidentally shipping it is
    // obvious in a leaked DB dump.
    key: process.env.ENCRYPTION_KEY || '0'.repeat(64),
  },
};

export default (): Config => config;
