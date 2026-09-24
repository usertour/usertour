import { InputType, PickType } from '@nestjs/graphql';

import type { SegmentDeletion } from '../types/segment-deletion.type';
import { SegmentDTO } from './segment.dto';

@InputType()
export class DeleteSegment
  extends PickType(SegmentDTO, ['id'], InputType)
  implements SegmentDeletion {}
