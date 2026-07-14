// ============================================================================
// Rich Text Node — lightweight Slate-compatible types (no slate dependency)
// ============================================================================

export interface RichTextLeaf {
  text: string;
  [key: string]: unknown;
}

export interface RichTextElement {
  type: string;
  children: RichTextNode[];
  [key: string]: unknown;
}

export type RichTextNode = RichTextLeaf | RichTextElement;

// ============================================================================

export type Pagination = {
  first?: number;
  last?: number;
  before?: string;
  after?: string;
};

export type PageInfo = {
  endCursor: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
};

// export interface Attributes {
//   [name: string]: string | number | boolean | null | undefined;
// }

export type ConditonElementState = {
  [key: string]: {
    element: HTMLElement;
    isVisable: boolean;
  };
};

export enum SDKSettingsMode {
  NORMAL = 'normal',
  PREVIEW = 'preview',
}
export type SDKSettings = {
  mode: SDKSettingsMode;
};

export type GlobalConfig = {
  isSelfHostedMode: boolean;
  apiUrl: string;
  ssoCallbackUrl: string;
  allowUserRegistration: boolean;
  allowProjectLevelSubscriptionManagement: boolean;
  needsSystemAdminSetup: boolean;
  require2FA: boolean;
  machineTranslationEnabled: boolean;
  authProviders: string[];
};
