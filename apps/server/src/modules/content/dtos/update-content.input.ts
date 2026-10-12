import { Field, InputType, PartialType, PickType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';

import type { ContentChanges } from '../types/content-changes.type';
import { ContentConfigScalar } from './content-config.scalar';
import { ContentInput } from './content.input';

@InputType()
export class UpdateContentInput
  extends PartialType(PickType(ContentInput, ['name', 'buildUrl']), InputType)
  implements ContentChanges
{
  // The content row's own config, unlike ContentInput.config, which seeds the
  // first version.
  @Field(() => ContentConfigScalar, { nullable: true })
  config?: JsonValue;
}
