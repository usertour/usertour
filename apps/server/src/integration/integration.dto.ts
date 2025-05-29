import { Field, InputType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class UpdateIntegrationInput {
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  key?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  config?: JsonValue;
}
