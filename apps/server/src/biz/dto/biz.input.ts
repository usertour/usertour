import { Field, InputType, OmitType } from '@nestjs/graphql';
import { BizModel } from '../models/biz.model';

@InputType()
export class CreateBizCompanyInput extends OmitType(
  BizModel,
  ['id', 'createdAt', 'updatedAt'],
  InputType,
) {
  @Field(() => String)
  userId: string;
}
