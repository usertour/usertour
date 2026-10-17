import { BaseDTO } from '@/modules/common/dtos/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';

import { ThemeSettingsScalar } from './theme-settings.scalar';
import { ThemeVariationScalar } from './theme-variation.scalar';

@ObjectType('Theme')
export class ThemeDTO extends BaseDTO {
  @Field()
  name: string;

  @Field(() => Boolean)
  isDefault: boolean;

  @Field(() => Boolean)
  isSystem: boolean;

  @Field(() => String)
  projectId: string;

  @Field(() => ThemeSettingsScalar)
  settings: JsonValue;

  @Field(() => [ThemeVariationScalar], { nullable: true })
  variations?: JsonValue;
}
