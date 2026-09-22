import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

import { BizCompanyOnSegmentInput } from './biz-company-on-segment.input';

@InputType()
export class CreateBizCompanyOnSegment {
  @Field(() => [BizCompanyOnSegmentInput])
  @IsNotEmpty()
  companyOnSegment: BizCompanyOnSegmentInput[];
}
