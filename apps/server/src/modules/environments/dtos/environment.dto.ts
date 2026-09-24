import { BaseDTO } from '@/modules/common/dtos/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Environment')
export class EnvironmentDTO extends BaseDTO {
  @Field()
  name: string;

  @Field(() => String)
  token: string;

  @Field(() => String)
  projectId: string;

  @Field(() => Boolean)
  isPrimary: boolean;

  @Field(() => Boolean)
  requireIdentityVerification: boolean;

  // @Field(() => Boolean)
  // published: boolean;
}
