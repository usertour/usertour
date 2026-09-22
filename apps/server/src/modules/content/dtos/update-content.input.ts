import { InputType, PartialType, PickType } from '@nestjs/graphql';

import type { ContentChanges } from '../types/content-changes.type';
import { ContentInput } from './content.input';

@InputType()
export class UpdateContentInput
  extends PartialType(PickType(ContentInput, ['name', 'buildUrl', 'config']), InputType)
  implements ContentChanges {}
