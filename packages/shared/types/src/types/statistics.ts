import { BizEvent, BizUser } from './biz';
import { Content, ContentVersion } from './contents';

export type ContentAnalytics = {
  id: string;
  externalId: string;
  environmentId: string;
  data: JSON;
  createdAt: string;
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

export type BizSession = {
  id: string;
  externalId: string;
  progress: number;
  environmentId: string;
  data: any;
  state: number;
  createdAt: string;
  bizUserId?: string;
  contentId?: string;
  bizUser?: BizUser;
  bizEvent?: BizEvent[];
  content?: Content;
  version?: ContentVersion;
};

export type QuestionData = {
  cvid: string;
  name: string;
  actions: any;
  // For multiple-choice questions
  options?: Array<{
    label: string;
    value: string;
    checked?: boolean;
  }>;
  // For star-rating and scale questions
  lowLabel?: string;
  lowRange?: number;
  highLabel?: string;
  highRange?: number;
  // For multiple-choice questions
  enableOther?: boolean;
  allowMultiple?: boolean;
  shuffleOptions?: boolean;
};

export type Question = {
  data: QuestionData;
  type: 'multiple-choice' | 'star-rating' | 'scale' | 'nps';
};

export type AnswerCount = {
  answer: string | number;
  count: number;
  percentage: number;
};

export type NPSAnalysis = {
  promoters: {
    count: number;
    percentage: number;
  };
  passives: {
    count: number;
    percentage: number;
  };
  detractors: {
    count: number;
    percentage: number;
  };
  npsScore: number;
  total: number;
};

export type RateAnalysis = {
  total: number;
  average: number;
};

export type NPSByDay = {
  day: string;
  startDate: string;
  endDate: string;
  metrics: NPSAnalysis;
  distribution: AnswerCount[];
};

export type AverageByDay = {
  day: string;
  startDate: string;
  endDate: string;
  metrics: RateAnalysis;
  distribution: AnswerCount[];
};

export type ContentQuestionAnalytics = {
  totalResponse: number;
  question: Question;
  answer: AnswerCount[];
  averageByDay?: AverageByDay[];
  npsAnalysisByDay?: NPSByDay[];
};
