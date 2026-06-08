import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

/** API token metadata as exposed to the owner. Never includes the secret. */
@ObjectType()
export class ApiToken {
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

/** Returned only by createApiToken — carries the plaintext token shown exactly once. */
@ObjectType()
export class CreatedApiToken {
  @Field(() => ApiToken)
  apiToken: ApiToken;

  /** The full plaintext token. Shown once at creation and never retrievable again. */
  @Field()
  token: string;
}

@InputType()
export class CreateApiTokenInput {
  @Field()
  @IsString()
  name: string;

  @Field(() => [String])
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  projectIds: string[];

  @Field(() => [String])
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes: string[];

  @Field(() => Date, { nullable: true })
  @IsOptional()
  expiresAt?: Date;
}
