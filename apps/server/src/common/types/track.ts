export interface TrackEventData {
  eventName: string;
  bizSessionId: string;
  userId: string;
  environmentId: string;
  eventProperties: Record<string, any>;
  userProperties: Record<string, any>;
}
