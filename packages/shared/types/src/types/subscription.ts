export type Subscription = {
  id: string;
  projectId: string;
  subscriptionId: string;
  lookupKey: string;
  planType: PlanType;
  interval: string;
  status: string;
  isTrial: boolean;
  cancelAt: string | null;
  overridePlan?: any;
};

export enum PlanType {
  HOBBY = 'hobby',
  PRO = 'pro',
  GROWTH = 'growth',
}
