import { InputType, OmitType } from '@nestjs/graphql';

import type { NewSegment } from '../types/new-segment.type';
import { SegmentDTO } from './segment.dto';

@InputType()
export class CreatSegment
  extends OmitType(SegmentDTO, ['id', 'createdAt', 'updatedAt'], InputType)
  implements NewSegment {}
