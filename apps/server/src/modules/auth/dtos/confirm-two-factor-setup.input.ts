import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
export class ConfirmTwoFactorSetupInput {
  @Field()
  @IsString()
  secret: string;

  @Field()
  @IsString()
  @MinLength(6)
  code: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  challengeToken?: string;
}
