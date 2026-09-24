import { InputType, PartialType, PickType } from '@nestjs/graphql';

import { CopyThemeInput } from './copy-theme.input';

@InputType()
export class DeleteThemeInput extends PartialType(PickType(CopyThemeInput, ['id']), InputType) {}
