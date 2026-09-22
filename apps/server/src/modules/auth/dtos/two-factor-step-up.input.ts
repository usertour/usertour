import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsString } from 'class-validator';

@InputType()
export class TwoFactorStepUpInput {
  @Field()
  @IsString()
  code: string;

  @Field(() => Boolean, { defaultValue: false })
  @IsBoolean()
  isRecoveryCode: boolean;
}
