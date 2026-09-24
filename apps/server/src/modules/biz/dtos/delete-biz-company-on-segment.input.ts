import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

import type { SegmentCompanyRemoval } from '../types/segment-company-removal.type';

@InputType()
export class DeleteBizCompanyOnSegment implements SegmentCompanyRemoval {
  @Field(() => [String])
  @IsNotEmpty()
  bizCompanyIds: string[];

  @Field(() => String)
  segmentId: string;
}
