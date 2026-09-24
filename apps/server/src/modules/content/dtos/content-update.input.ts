import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

import { UpdateContentInput } from './update-content.input';

@InputType()
export class ContentUpdateInput {
  @Field()
  @IsNotEmpty()
  contentId: string;

  @Field(() => UpdateContentInput, { nullable: false })
  content: UpdateContentInput;
}
