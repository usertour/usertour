import { ObjectType } from '@nestjs/graphql';

import { PaginatedResponse } from '@/modules/common/dtos/paginated-response.dto';

import { VersionDTO } from './version.dto';

@ObjectType('VersionConnection')
export class VersionConnectionDTO extends PaginatedResponse(VersionDTO, 'Version') {}
