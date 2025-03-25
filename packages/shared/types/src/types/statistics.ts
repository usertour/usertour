import { BizEvent, BizUser } from './biz';
import { Content, ContentVersion } from './contents';

export type ContentAnalytics = {
  id: string;
  externalId: string;
  environmentId: string;
  data: JSON;
  createdAt: string;
};

export type BizSession = {
  id: string;
  externalId: string;
  environmentId: string;
  data: JSON;
  createdAt: string;
  bizUser?: BizUser;
  bizEvent?: BizEvent[];
  content?: Content;
  version?: ContentVersion;
};

export type AnalyticsQuery = {
  contentId: string;
  startDate: string;
  endDate: string;
};

export type AnalyticsViews = {
  uniqueViews: number;
  totalViews: number;
  uniqueCompletions: number;
  totalCompletions: number;
};

export type AnalyticsViewsByDay = AnalyticsViews & {
  date: string;
};

export type AnalyticsViewsByStep = {
  name: string;
  stepIndex: number;
  analytics: AnalyticsViews;
};

export type AnalyticsViewsByTask = {
  name: string;
  taskId: string;
  analytics: AnalyticsViews;
};

export type AnalyticsData = AnalyticsViews & {
  viewsByDay: AnalyticsViewsByDay[];
  viewsByStep: AnalyticsViewsByStep[];
  viewsByTask: AnalyticsViewsByTask[];
};

export type BizSessionObject = {
  id: string;
  createdAt: string;
  progress: number;
  data: any;
  bizUserId: string;
  state: number;
  contentId: string;
  bizUser: { externalId: string };
  bizEvent: { data: any; createdAt: string; eventId: string }[];
};
