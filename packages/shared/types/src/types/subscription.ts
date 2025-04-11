export type Subscription = {
  id: string;
  projectId: string;
  subscriptionId: string;
  lookupKey: string;
  planType: string;
  interval: string;
  status: string;
  isTrial: boolean;
  cancelAt: string | null;
  overridePlan?: any;
};
