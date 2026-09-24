import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class CancelInviteInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  inviteId: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  projectId: string;
}
