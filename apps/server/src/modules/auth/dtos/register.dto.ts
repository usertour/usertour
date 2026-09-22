import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Register')
export class RegisterDTO extends BaseModel {
  @Field()
  email: string;
}
