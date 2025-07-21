import { ContentType } from '@/content/models/content.model';
import { ContentConfigObject } from '@/content/models/version.model';
import { BizCompany, BizEvent, BizSession, BizUser, Step, Version, Event } from '@prisma/client';

// Base request interface with token
export interface BaseRequest {
  token: string;
}

// Config request and response
export interface ConfigRequest extends BaseRequest {}

export interface ConfigResponse {
  removeBranding: boolean;
  planType: string;
}

// List contents request
export interface ListContentsRequest extends BaseRequest {
  userId?: string;
  companyId?: string;
}

// List themes request
export interface ListThemesRequest extends BaseRequest {
  userId?: string;
  companyId?: string;
}

// Upsert user request
export interface UpsertUserRequest extends BaseRequest {
  userId: string;
  attributes?: Record<string, any>;
}

// Upsert company request
export interface UpsertCompanyRequest extends BaseRequest {
  companyId: string;
  userId: string;
  attributes?: Record<string, any>;
  membership?: Record<string, any>;
}

// Create session request
export interface CreateSessionRequest extends BaseRequest {
  userId: string;
  contentId: string;
  companyId?: string;
}

// Track event request
export interface TrackEventRequest extends BaseRequest {
  userId: string;
  eventName: string;
  sessionId: string;
  eventData: Record<string, any>;
}

// Identity request (for testing)
export interface IdentityRequest {
  data: number;
}

// Response types
export type UpsertUserResponse = BizUser | null;

export type UpsertCompanyResponse = BizCompany | null;

export type CreateSessionResponse = BizSession | null;

export type ContentSession = {
  contentId: string;
  latestSession?: BizSessionWithEvents;
  totalSessions: number;
  dismissedSessions: number;
  completedSessions: number;
  seenSessions: number;
};

export type TrackEventResponse = ContentSession;

export type BizEventWithEvent = BizEvent & { event: Event };
export type BizSessionWithEvents = BizSession & { bizEvent: BizEventWithEvent[] };

export type ContentResponse = Version & {
  type: ContentType;
  name: string;
  data: any;
  steps: Step[];
  config: ContentConfigObject;
  latestSession?: BizSessionWithEvents;
  totalSessions: number;
  dismissedSessions: number;
  completedSessions: number;
  seenSessions: number;
};
