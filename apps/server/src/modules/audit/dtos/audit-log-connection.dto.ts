import { ObjectType } from '@nestjs/graphql';

import PaginatedResponse from '@/common/pagination/pagination';

import { AuditLogDTO } from './audit-log.dto';

@ObjectType('AuditLogConnection')
export class AuditLogConnectionDTO extends PaginatedResponse(AuditLogDTO, 'AuditLog') {}
