/** A content's sessions within a date window — the filter the analytics reads take. */
export type AnalyticsFilter = {
  contentId: string;
  startDate: string;
  endDate: string;
  timezone: string;
  environmentId: string;
};
