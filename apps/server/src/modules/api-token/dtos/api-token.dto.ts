import { Field, ID, ObjectType } from '@nestjs/graphql';

/** API token metadata as exposed to the owner. Never includes the secret. */
@ObjectType('ApiToken')
export class ApiTokenDTO {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  prefix: string;

  /** Trailing characters of the secret, for display only. */
  @Field()
  partialKey: string;

  /** Capability strings this token may exercise (intersected with the owner's role at use time). */
  @Field(() => [String])
  scopes: string[];

  @Field(() => [String])
  projectIds: string[];

  /** Environment ids this token may act on; null/absent = all environments (legacy/default). */
  @Field(() => [String], { nullable: true })
  environmentIds?: string[];

  @Field({ nullable: true })
  clientId?: string;

  @Field()
  isActive: boolean;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;

  @Field(() => Date, { nullable: true })
  lastUsedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
