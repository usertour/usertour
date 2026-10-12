import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsNotEmpty, ValidateNested } from 'class-validator';

import { UpdateContentInput } from './update-content.input';

@InputType()
export class ContentUpdateInput {
  @Field()
  @IsNotEmpty()
  contentId: string;

  // Validated as a nested object so UpdateContentInput's own rules run.
  @Field(() => UpdateContentInput, { nullable: false })
  @ValidateNested()
  @Type(() => UpdateContentInput)
  content: UpdateContentInput;
}
