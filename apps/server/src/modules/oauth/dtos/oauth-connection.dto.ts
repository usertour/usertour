import { Field, ID, ObjectType } from '@nestjs/graphql';

/** A user-facing "connected app": one active OAuth grant. */
@ObjectType('OAuthConnection')
export class OAuthConnectionDTO {
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

  /** Environment names this connection may act on; null = all environments. */
  @Field(() => [String], { nullable: true })
  environmentNames?: string[] | null;

  @Field()
  createdAt: Date;

  @Field(() => Date, { nullable: true })
  lastUsedAt?: Date | null;
}
