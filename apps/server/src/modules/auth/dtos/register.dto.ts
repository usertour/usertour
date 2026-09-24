import { BaseDTO } from '@/modules/common/dtos/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Register')
export class RegisterDTO extends BaseDTO {
  @Field()
  email: string;
}
