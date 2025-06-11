export interface Config {
  nest: {
    port: number;
  };
  cors: {
    enabled: boolean;
  };
  swagger: {
    enabled: boolean;
    title: string;
    description: string;
    version: string;
    path: string;
  };
  graphql: {
    playgroundEnabled: boolean;
    debug: boolean;
    schemaDestination: string;
    sortSchema: boolean;
  };
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    schema: string;
    url: string;
  };
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
  redis: {
    url: string;
  };
  app: {
    homepageUrl: string;
    apiUrl: string;
    docUrl: string;
  };
  aws: {
    s3: {
      region: string;
      endpoint: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucket: string;
      domain: string;
    };
  };
  auth: {
    redirectUrl: string;
    cookie: {
      secure: boolean;
      domain: string;
    };
    email: {
      enabled: boolean;
      sender: string;
      resendApiKey: string;
    };
    jwt: {
      secret: string;
      expiresIn: string;
      refreshExpiresIn: string;
    };
    github: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
    google: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
  };
  stripe: {
    apiKey: string;
    webhookSecret: {
      account: string;
      accountTest: string;
    };
    sessionSuccessUrl: string;
    sessionCancelUrl: string;
    portalReturnUrl: string;
  };
  content: {
    limit: {
      survey: number;
    };
  };
  globalConfig: {
    enabledBillingUsers: string[];
    isSelfHostedMode: boolean;
  };
}
