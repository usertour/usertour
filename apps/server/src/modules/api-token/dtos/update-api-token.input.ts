import { Field, InputType } from '@nestjs/graphql';
import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

import type { ApiTokenChanges } from '../types/api-token-changes.type';

/** Partial edit of a token's metadata. Only the provided fields change. */
@InputType()
export class UpdateApiTokenInput implements ApiTokenChanges {
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

  /**
   * Three-state: absent = untouched; explicit null = clear (only valid while the
   * final scopes are project-level — env-targeted scopes must name environments);
   * array = replace the allowlist.
   */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  environmentIds?: string[] | null;
}
