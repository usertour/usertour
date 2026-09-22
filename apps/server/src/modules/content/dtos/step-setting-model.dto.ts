import { ObjectType } from '@nestjs/graphql';

@ObjectType('StepSettingModel')
export class StepSettingModelDTO {
  enabledBackdrop?: boolean;
  enabledBlockTarget?: boolean;
  align?: string;
  side?: string;
  alignType?: string;
  sideOffset?: number;
  alignOffset?: number;
  width?: number;
  skippable?: boolean;
  position?: string;
  positionOffsetX?: number;
  positionOffsetY?: number;
}
