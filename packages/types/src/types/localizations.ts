export type Localization = {
  id: string;
  projectId: string;
  name: string;
  locale: string;
  code: string;
  createdAt: string;
  isDefault: boolean;
};

export type VersionOnLocalization = {
  id: string;
  versionId: string;
  enabled: boolean;
  localizationId: string;
  localized: any;
  backup: any;
  updatedAt: string;
  createdAt: string;
};
