/** A user as the runtime's `latestSession` carries it. The dashboard types users from its documents (`BizUser` in `@usertour/hooks`). */
export type RuntimeBizUser = {
  id: string;
  externalId: string;
  environmentId: string;
  data: any;
  createdAt: string;
  bizUsersOnCompany?: RuntimeBizUserOnCompany[];
};

export type RuntimeBizUserOnCompany = {
  id: string;
  bizCompanyId: string;
  bizCompany: RuntimeBizCompany;
  bizUserId: string;
  data: any;
};

export type RuntimeBizCompany = {
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

export type RuntimeCustomEvent = {
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

export type RuntimeBizEvent = {
  id: string;
  createdAt: string;
  updatedAt: string;
  eventId: string;
  event?: RuntimeCustomEvent;
  data: any | null;
  bizUserId: string;
  bizSessionId?: string | null;
  bizCompanyId?: string | null;
  bizCompany?: RuntimeBizCompany;
  bizUser?: RuntimeBizUser;
};
