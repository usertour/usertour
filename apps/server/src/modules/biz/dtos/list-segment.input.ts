import { ArgsType, PickType } from '@nestjs/graphql';

import { SegmentDTO } from './segment.dto';

@ArgsType()
export class ListSegment extends PickType(SegmentDTO, ['environmentId'], ArgsType) {}
