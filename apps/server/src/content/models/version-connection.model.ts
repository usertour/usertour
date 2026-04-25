import PaginatedResponse from '@/common/pagination/pagination';
import { ObjectType } from '@nestjs/graphql';
import { Version } from './version.model';

@ObjectType()
export class VersionConnection extends PaginatedResponse(Version) {}
