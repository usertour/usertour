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
  security: {
    expiresIn: string;
    refreshIn: string;
    bcryptSaltOrRound: number;
    jwtAccessSecret: string;
    jwtRefreshSecret: string;
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
    host: string;
    port: number;
    password: string;
  };
  app: {
    homepageUrl: string;
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
}
