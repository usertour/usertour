import { BizEvent } from './biz';
import { ContentVersion } from './contents';

export type SDKContent = ContentVersion & {
  name: string;
  totalSessions: number;
  events: BizEvent[];
};

export enum flowEndReason {
  USER_CLOSED = 'user_closed',
  ELEMENT_NOT_FOUND = 'element_not_found',
}
