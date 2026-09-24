import { InputType, PickType } from '@nestjs/graphql';

import type { SegmentCompanyMembership } from '../types/segment-company-membership.type';
import { BizCompanyOnSegmentDTO } from './biz-company-on-segment.dto';

@InputType()
export class BizCompanyOnSegmentInput
  extends PickType(BizCompanyOnSegmentDTO, ['segmentId', 'bizCompanyId', 'data'], InputType)
  implements SegmentCompanyMembership {}
