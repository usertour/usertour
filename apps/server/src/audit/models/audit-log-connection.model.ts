import { ObjectType } from '@nestjs/graphql';
import PaginatedResponse from '@/common/pagination/pagination';
import { AuditLog } from './audit-log.model';

@ObjectType()
export class AuditLogConnection extends PaginatedResponse(AuditLog) {}
