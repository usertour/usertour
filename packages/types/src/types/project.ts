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
  name?: string;
  logoUrl?: string;
  environments?: Environment[];
  customerId?: string;
  subscriptionId?: string;
};
