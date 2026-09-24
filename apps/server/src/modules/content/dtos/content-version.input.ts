import { Field, InputType, PickType } from '@nestjs/graphql';

import type { NewContentVersion } from '../types/new-content-version.type';
import { ContentInput } from './content.input';

@InputType()
export class ContentVersionInput
  extends PickType(ContentInput, ['config'] as const)
  implements NewContentVersion
{
  @Field()
  versionId: string;
}
