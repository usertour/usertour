import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class BizEventQuery {
  @Field(() => String)
  environmentId: string;

  @Field(() => String, { nullable: true })
  userId?: string;

  @Field(() => String, { nullable: true })
  companyId?: string;
}
