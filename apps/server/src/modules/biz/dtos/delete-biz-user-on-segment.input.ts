import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

import type { SegmentUserRemoval } from '../types/segment-user-removal.type';

@InputType()
export class DeleteBizUserOnSegment implements SegmentUserRemoval {
  @Field(() => [String])
  @IsNotEmpty()
  bizUserIds: string[];

  @Field(() => String)
  segmentId: string;
}
