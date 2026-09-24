import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MaxLength, MinLength } from 'class-validator';

import type { InviteAcceptance } from '../types/invite-acceptance.type';

@InputType()
export class AcceptInviteInput implements InviteAcceptance {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  code: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(160)
  password: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  @MaxLength(80)
  userName: string;
}
