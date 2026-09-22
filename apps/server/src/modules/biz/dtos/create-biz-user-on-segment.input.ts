import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

import { BizUserOnSegmentInput } from './biz-user-on-segment.input';

@InputType()
export class CreateBizUserOnSegment {
  @Field(() => [BizUserOnSegmentInput])
  @IsNotEmpty()
  userOnSegment: BizUserOnSegmentInput[];
}
