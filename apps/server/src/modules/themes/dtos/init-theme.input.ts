import { InputType, OmitType } from '@nestjs/graphql';

import { ThemeDTO } from './theme.dto';

@InputType()
export class InitThemeInput extends OmitType(
  ThemeDTO,
  ['id', 'createdAt', 'updatedAt', 'projectId'],
  InputType,
) {}
