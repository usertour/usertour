import { BaseDTO } from '@/modules/common/dtos/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Localization')
export class LocalizationDTO extends BaseDTO {
  @Field(() => String)
  name: string;

  @Field(() => String)
  locale: string;

  @Field(() => String)
  code: string;

  @Field(() => String)
  projectId: string;

  @Field(() => Boolean)
  isDefault: boolean;
}
