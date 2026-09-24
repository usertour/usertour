import { Field, InputType, PartialType, PickType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

import { ContentInput } from './content.input';

@InputType()
export class ContentDuplicateInput extends PartialType(
  PickType(ContentInput, ['name']),
  InputType,
) {
  @Field()
  @IsNotEmpty()
  contentId: string;
}
