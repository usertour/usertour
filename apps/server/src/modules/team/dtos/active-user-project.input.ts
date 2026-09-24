import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class ActiveUserProjectInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  userId: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  projectId: string;
}
