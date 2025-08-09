import { BizCompany, BizUser } from '@prisma/client';

// V2 requests don't need token in message body since it comes from handshake
export interface UpsertUserRequestV2 {
  userId: string;
  attributes?: Record<string, any>;
}

export interface UpsertCompanyRequestV2 {
  companyId: string;
  userId: string;
  attributes?: Record<string, any>;
  membership?: Record<string, any>;
}

export interface TrackEventRequestV2 {
  userId: string;
  eventName: string;
  sessionId: string;
  eventData: Record<string, any>;
}

// Response types remain the same
export type UpsertUserResponseV2 = BizUser | null;
export type UpsertCompanyResponseV2 = BizCompany | null;
