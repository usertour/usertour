export type Environment = {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  isPrimary?: boolean;
};

export type Project = {
  id?: string;
  role?: string;
  actived?: boolean;
  /** Environments the current user may act on in this project; null/undefined = all. */
  allowedEnvironmentIds?: string[] | null;
  name?: string;
  logoUrl?: string;
  environments?: Environment[];
  customerId?: string;
  subscriptionId?: string;
};
