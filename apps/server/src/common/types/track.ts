export interface TrackEventData {
  eventName: string;
  bizSessionId: string;
  userId: string;
  environmentId: string;
  projectId: string;
  eventProperties: Record<string, any>;
  userProperties: Record<string, any>;
}
