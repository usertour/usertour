import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class RemoveTeamMemberInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  projectId: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  userId: string;
}
