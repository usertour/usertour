export type BizUser = {
  id: string;
  externalId: string;
  environmentId: string;
  data: any;
  createdAt: string;
  bizUsersOnCompany?: BizUserOnCompany[];
};

export type BizUserOnCompany = {
  id: string;
  bizCompanyId: string;
  bizCompany: BizCompany;
  bizUserId: string;
  data: any;
};

export type BizCompany = {
  id: string;
  externalId: string;
  environmentId: string;
  data: any;
  createdAt: string;
};

export type BizQuery = {
  environmentId: string;
  data: JSON;
};

export type CustomEvent = {
  id: string;
  createdAt: string;
  updatedAt: string;
  displayName: string;
  codeName: string;
  description: string;
  deleted: boolean;
  predefined: boolean;
  projectId: string;
};

export type BizEvent = {
  id: string;
  createdAt: string;
  updatedAt: string;
  eventId: string;
  event?: CustomEvent;
  data: any | null;
  bizUserId: string;
  bizSessionId: string | null;
};
