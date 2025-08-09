import { ContentConfigObject, ContentDataType } from '@usertour/types';
import { BizSessionWithEvents, Step, Version } from './schema';

export type UnionContentSession = {
  contentId: string;
  latestSession?: BizSessionWithEvents;
  totalSessions: number;
  dismissedSessions: number;
  completedSessions: number;
  seenSessions: number;
};

export type UnionContentVersion = Omit<Version, 'data' | 'steps' | 'config'> &
  Omit<UnionContentSession, 'contentId'> & {
    type: ContentDataType;
    name: string;
    data: any;
    steps: Step[];
    config: ContentConfigObject;
  };
