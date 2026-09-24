import type { AnalyticsFilter } from './analytics-filter.type';

/** AnalyticsFilter narrowed to one step — what queryTooltipTargetMissingSessions takes. */
export type TooltipTargetMissingFilter = AnalyticsFilter & {
  stepCvid: string;
};
