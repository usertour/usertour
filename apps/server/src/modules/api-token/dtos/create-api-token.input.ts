import { Field, InputType } from '@nestjs/graphql';
import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

import type { NewApiToken } from '../types/new-api-token.type';

@InputType()
export class CreateApiTokenInput implements NewApiToken {
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

  /** Environments this token may act on. Omit → all environments (back-compat); the UI
   * sends an explicit non-empty set (safe-first). Each must belong to a listed project. */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  environmentIds?: string[];

  @Field(() => Date, { nullable: true })
  @IsOptional()
  expiresAt?: Date;
}
