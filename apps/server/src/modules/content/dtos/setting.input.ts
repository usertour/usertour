import { InputType, PartialType } from '@nestjs/graphql';

import { StepSettingModelDTO } from './step-setting-model.dto';

@InputType()
export class SettingInput extends PartialType(StepSettingModelDTO, InputType) {}
