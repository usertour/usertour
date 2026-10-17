import { Field, InputType, PartialType, PickType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import { IsObject, ValidateIf } from 'class-validator';

import type { ContentChanges } from '../types/content-changes.type';
import { ContentConfigScalar } from './content-config.scalar';
import { ContentInput } from './content.input';

// A patch. `skipNullProperties: false` keeps ContentInput's string check on
// `name` when it is sent, so a null for the non-nullable column is rejected
// rather than handed to the database.
@InputType()
export class UpdateContentInput
  extends PartialType(PickType(ContentInput, ['buildUrl', 'name']), {
    decorator: InputType,
    skipNullProperties: false,
  })
  implements ContentChanges
{
  // The content row's own config, unlike ContentInput.config, which seeds the
  // first version. May be omitted; when sent it is the object, never null.
  @Field(() => ContentConfigScalar, { nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @IsObject()
  config?: JsonValue;
}
