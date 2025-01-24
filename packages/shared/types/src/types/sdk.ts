import { ContentVersion } from "./contents";
import { BizEvent } from "./biz";

export type SDKContent = ContentVersion & {
  name: string;
  totalSessions: number;
  events: BizEvent[];
};

export enum flowEndReason {
  USER_CLOSED = "user_closed",
  ELEMENT_NOT_FOUND = "element_not_found",
}
