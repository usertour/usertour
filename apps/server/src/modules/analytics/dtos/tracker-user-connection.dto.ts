import { ObjectType } from '@nestjs/graphql';

import PaginatedResponse from '@/common/pagination/pagination';

import { TrackerUserDTO } from './tracker-user.dto';

@ObjectType('TrackerUserConnection')
export class TrackerUserConnectionDTO extends PaginatedResponse(TrackerUserDTO, 'TrackerUser') {}
