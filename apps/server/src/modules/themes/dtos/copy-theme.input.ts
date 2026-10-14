import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

import type { ThemeCopy } from '../types/theme-copy.type';

@InputType()
export class CopyThemeInput implements ThemeCopy {
  @Field(() => String)
  @IsString()
  id: string;
  // Required on purpose: the copy service uses it verbatim as the new
  // theme's name and has no fallback for an omitted value.
  @Field(() => String)
  @IsString()
  name: string;
}
