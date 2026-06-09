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

/**
 * Carries a plaintext token shown exactly once — returned by createApiToken (a
 * brand-new token) and rotateApiToken (a freshly-rotated secret).
 */
@ObjectType()
export class CreatedApiToken {
  @Field(() => ApiToken)
  apiToken: ApiToken;

  /** The full plaintext token. Shown once and never retrievable again. */
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

/** Partial edit of a token's metadata. Only the provided fields change. */
@InputType()
export class UpdateApiTokenInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  projectIds?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes?: string[];
}
