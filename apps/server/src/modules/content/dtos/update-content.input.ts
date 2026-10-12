import { Field, InputType, PartialType, PickType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import { IsString, ValidateIf } from 'class-validator';

import type { ContentChanges } from '../types/content-changes.type';
import { ContentConfigScalar } from './content-config.scalar';
import { ContentInput } from './content.input';

@InputType()
export class UpdateContentInput
  extends PartialType(PickType(ContentInput, ['buildUrl']), InputType)
  implements ContentChanges
{
  // Declared here rather than picked: PartialType marks a picked field
  // optional in a way that also skips null, and the column is not nullable,
  // so an explicit null is rejected rather than handed to the database.
  @Field(() => String, { nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  name?: string;

  // The content row's own config, unlike ContentInput.config, which seeds the
  // first version.
  @Field(() => ContentConfigScalar, { nullable: true })
  config?: JsonValue;
}
