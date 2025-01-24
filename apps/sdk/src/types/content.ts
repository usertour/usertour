export type ReportEventParams = {
  contentId: string;
  eventData: any;
  eventName: string;
  userId: string;
  sessionId?: string;
};

export type ReportEventOptions = {
  isDeleteSession?: boolean;
  isCreateSession?: boolean;
};
