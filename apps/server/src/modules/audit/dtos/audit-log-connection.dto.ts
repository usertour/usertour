import { ObjectType } from '@nestjs/graphql';

import { PaginatedResponse } from '@/modules/common/dtos/paginated-response.dto';

import { AuditLogDTO } from './audit-log.dto';

@ObjectType('AuditLogConnection')
export class AuditLogConnectionDTO extends PaginatedResponse(AuditLogDTO, 'AuditLog') {}
