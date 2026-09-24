import { InputType, PickType } from '@nestjs/graphql';

import type { SegmentUserMembership } from '../types/segment-user-membership.type';
import { BizUserOnSegmentDTO } from './biz-user-on-segment.dto';

@InputType()
export class BizUserOnSegmentInput
  extends PickType(BizUserOnSegmentDTO, ['segmentId', 'bizUserId', 'data'], InputType)
  implements SegmentUserMembership {}
