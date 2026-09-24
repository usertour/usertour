import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsString } from 'class-validator';

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
