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

// Salesforce Object Fields Type Definitions
export interface SalesforcePicklistValue {
  label: string;
  value: string;
}

export interface SalesforceField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  unique: boolean;
  referenceTo?: string[];
  picklistValues?: SalesforcePicklistValue[];
}

export interface SalesforceObject {
  name: string;
  label: string;
  fields: SalesforceField[];
}

export interface SalesforceObjectFields {
  standardObjects: SalesforceObject[];
  customObjects: SalesforceObject[];
}

// Data structure for object mapping
export interface IntegrationObjectMappingItem {
  sourceFieldName: string;
  sourceObjectType: string;
  targetFieldName: string;
  targetObjectType: string;
  isNew?: boolean;
}

// Complete object mapping configuration
export interface IntegrationObjectMappingConfig {
  matchObjects: IntegrationObjectMappingItem;
  sourceToTarget: IntegrationObjectMappingItem[];
  targetToSource: IntegrationObjectMappingItem[];
}
