import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ContentQuery {
  @Field()
  environmentId: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  type?: string;

  @Field(() => Boolean, { nullable: true })
  published?: boolean;
}
