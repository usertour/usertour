import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SessionQuery {
  @Field(() => String, { nullable: false })
  environmentId: string;

  @Field(() => String, { nullable: true })
  externalUserId?: string;

  @Field(() => String, { nullable: true })
  externalCompanyId?: string;

  @Field(() => String, { nullable: true })
  contentId?: string;

  @Field(() => String, { nullable: true })
  startDate?: string;

  @Field(() => String, { nullable: true })
  endDate?: string;
}
