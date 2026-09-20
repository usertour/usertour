import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('AccessToken')
export class AccessTokenDTO {
  @Field(() => ID)
  id: string;

  @Field()
  prefix: string;

  @Field()
  accessToken: string;

  @Field()
  name: string;

  @Field()
  isActive: boolean;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;

  @Field(() => Date, { nullable: true })
  lastUsedAt?: Date;

  @Field({ nullable: true })
  description?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
