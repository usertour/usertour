import type { JsonObject } from '@prisma/client/runtime/library';

/** Which users / companies to list — what BizService.queryBizUser / queryBizCompany take. */
export type BizFilter = {
  environmentId: string;
  segmentId?: string;
  userId?: string;
  companyId?: string;
  search?: string;
  data?: JsonObject;
};
