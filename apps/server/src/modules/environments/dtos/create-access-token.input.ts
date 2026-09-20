import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

import type { NewAccessToken } from '../types/new-access-token.type';

@InputType()
export class CreateAccessTokenInput implements NewAccessToken {
  @Field()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;
}
