import { BizSessionWithEvents, VersionWithStepsAndContent } from './schema';
import { ContentConfigObject } from '@usertour/types';

export type CustomContentSession = {
  contentId: string;
  latestSession?: BizSessionWithEvents;
  totalSessions: number;
  dismissedSessions: number;
  completedSessions: number;
  seenSessions: number;
};

export type CustomContentVersion = Omit<VersionWithStepsAndContent, 'config'> & {
  session: CustomContentSession;
  config: ContentConfigObject;
};
