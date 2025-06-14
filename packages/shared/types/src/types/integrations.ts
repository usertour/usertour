export type UpdateIntegrationInput = {
  enabled: boolean;
  config?: any;
};

export type IntegrationModel = {
  id: string;
  provider: string;
  key: string;
  accessToken: string;
  config?: any;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  integrationOAuth?: {
    data?: any;
  };
};
