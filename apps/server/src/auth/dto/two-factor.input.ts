import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

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

@InputType()
export class VerifyTwoFactorInput {
  @Field()
  @IsString()
  challengeToken: string;

  @Field()
  @IsString()
  code: string;

  @Field(() => Boolean, { defaultValue: false })
  @IsBoolean()
  isRecoveryCode: boolean;
}

@InputType()
export class TwoFactorStepUpInput {
  @Field()
  @IsString()
  code: string;

  @Field(() => Boolean, { defaultValue: false })
  @IsBoolean()
  isRecoveryCode: boolean;
}
