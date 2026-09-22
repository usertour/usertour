import { ObjectType } from '@nestjs/graphql';

import PaginatedResponse from '@/common/pagination/pagination';

import { VersionDTO } from './version.dto';

@ObjectType('VersionConnection')
export class VersionConnectionDTO extends PaginatedResponse(VersionDTO, 'Version') {}
