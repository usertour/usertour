import { InputType, PickType } from '@nestjs/graphql';

import type { SegmentChanges } from '../types/segment-changes.type';
import { SegmentDTO } from './segment.dto';

@InputType()
export class UpdateSegment
  extends PickType(SegmentDTO, ['name', 'data', 'id', 'columns'], InputType)
  implements SegmentChanges {}
