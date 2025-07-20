export type UpdateIntegrationInput = {
  enabled: boolean;
  config?: any;
  key?: string;
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

export type IntegrationObjectMappingModel = {
  id: string;
  createdAt: string;
  updatedAt: string;
  sourceObjectType: string;
  destinationObjectType: string;
  enabled: boolean;
  isSyncing: boolean;
  lastSyncedAt?: Date;
  settings?: IntegrationObjectMappingSettings;
  integrationId: string;
  integration?: IntegrationModel;
};

// Salesforce Object Fields Type Definitions
export type SalesforcePicklistValue = {
  label: string;
  value: string;
};

export type SalesforceField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
  unique: boolean;
  referenceTo?: string[];
  picklistValues?: SalesforcePicklistValue[];
};

export type SalesforceObject = {
  name: string;
  label: string;
  fields: SalesforceField[];
};

export type SalesforceObjectFields = {
  standardObjects: SalesforceObject[];
  customObjects: SalesforceObject[];
};

// Data structure for object mapping
export type IntegrationObjectMappingItem = {
  sourceFieldName: string;
  sourceObjectType: string;
  targetFieldName: string;
  targetObjectType: string;
  isNew?: boolean;
};

// Complete object mapping configuration
export type IntegrationObjectMappingSettings = {
  isSyncStream?: boolean;
  matchObjects: IntegrationObjectMappingItem;
  sourceToTarget: IntegrationObjectMappingItem[];
  targetToSource: IntegrationObjectMappingItem[];
};
