export type UpdateIntegrationInput = {
  enabled: boolean;
  key: string;
  config?: any;
};

export type IntegrationModel = {
  id: string;
  code: string;
  key: string;
  config?: any;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};
