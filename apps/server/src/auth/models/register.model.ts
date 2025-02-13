import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Register extends BaseModel {
  @Field()
  email: string;
}
