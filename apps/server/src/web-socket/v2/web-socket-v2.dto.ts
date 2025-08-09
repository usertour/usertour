import { BizCompany, BizUser, Theme } from '@/common/types/schema';

export interface ConfigResponse {
  removeBranding: boolean;
  planType: string;
}

// List contents request
export interface ListContentsRequest {
  userId?: string;
  companyId?: string;
}

// List themes request
export interface ListThemesRequest {
  userId?: string;
  companyId?: string;
}

// Get project settings request and response
export interface GetProjectSettingsRequest {
  userId?: string;
  companyId?: string;
}

export interface GetProjectSettingsResponse {
  config: ConfigResponse;
  themes: Theme[];
}

// Upsert user request
export interface UpsertUserRequest {
  userId: string;
  attributes?: Record<string, any>;
}

// Upsert company request
export interface UpsertCompanyRequest {
  companyId: string;
  userId: string;
  attributes?: Record<string, any>;
  membership?: Record<string, any>;
}

// Create session request
export interface CreateSessionRequest {
  userId: string;
  contentId: string;
  companyId?: string;
  reason?: string;
  context?: {
    pageUrl?: string;
    viewportWidth?: number;
    viewportHeight?: number;
  };
}

// Track event request
export interface TrackEventRequest {
  userId: string;
  eventName: string;
  sessionId: string;
  eventData: Record<string, any>;
}

// Identity request (for testing)
export interface IdentityRequest {
  data: number;
}

export type StartFlowRequest = {
  contentId: string;
  stepIndex?: number;
};

// Response types
export type UpsertUserResponse = BizUser | null;

export type UpsertCompanyResponse = BizCompany | null;
