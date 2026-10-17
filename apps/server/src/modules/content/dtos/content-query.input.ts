import { Field, InputType } from '@nestjs/graphql';

import { ContentTypeScalar } from './content-type.scalar';

@InputType()
export class ContentQuery {
  @Field()
  environmentId: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => ContentTypeScalar, { nullable: true })
  type?: string;

  @Field(() => Boolean, { nullable: true })
  published?: boolean;
}
