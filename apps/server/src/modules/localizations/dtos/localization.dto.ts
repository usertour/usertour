import { BaseDTO } from '@/modules/common/dtos/base.dto';
import { IsBoolean, IsString } from 'class-validator';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Localization')
export class LocalizationDTO extends BaseDTO {
  @Field(() => String)
  @IsString()
  name: string;

  @Field(() => String)
  @IsString()
  locale: string;

  @Field(() => String)
  @IsString()
  code: string;

  @Field(() => String)
  @IsString()
  projectId: string;

  @Field(() => Boolean)
  @IsBoolean()
  isDefault: boolean;
}
