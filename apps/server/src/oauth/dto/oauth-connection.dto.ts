import { Field, ID, ObjectType } from '@nestjs/graphql';

/** A user-facing "connected app": one active OAuth grant. */
@ObjectType()
export class OAuthConnection {
  @Field(() => ID)
  id: string;

  @Field()
  clientName: string;

  @Field()
  projectId: string;

  @Field()
  projectName: string;

  @Field(() => [String])
  scopes: string[];

  @Field()
  createdAt: Date;

  @Field(() => Date, { nullable: true })
  lastUsedAt?: Date | null;
}
