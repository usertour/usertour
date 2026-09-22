/** Optional filters for the audit-log list (project is a separate argument). */
export type AuditLogFilter = {
  resourceType?: string;
  resourceId?: string;
  action?: string;
  source?: string;
  environmentId?: string;
  actorUserId?: string;
  /** Inclusive lower bound on createdAt (merged with the plan retention window). */
  createdAtFrom?: Date;
  /** Inclusive upper bound on createdAt. */
  createdAtTo?: Date;
};
