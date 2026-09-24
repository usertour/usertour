import { Field, InputType, OmitType } from '@nestjs/graphql';
import { BizModelDTO } from './biz.dto';

@InputType()
export class CreateBizCompanyInput extends OmitType(
  BizModelDTO,
  ['id', 'createdAt', 'updatedAt'],
  InputType,
) {
  @Field(() => String)
  userId: string;
}
