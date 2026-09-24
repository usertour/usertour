import { ObjectType } from '@nestjs/graphql';

import { PaginatedResponse } from '@/modules/common/dtos/paginated-response.dto';

import { TrackerUserDTO } from './tracker-user.dto';

@ObjectType('TrackerUserConnection')
export class TrackerUserConnectionDTO extends PaginatedResponse(TrackerUserDTO, 'TrackerUser') {}
