import { ObjectType } from '@nestjs/graphql';

@ObjectType('TargetModel')
export class TargetModelDTO {
  selectors?: string;
  content?: string;
  sequence?: string;
  precision?: string;
  isDynamicContent?: boolean;
  customSelector?: string;
  type: string;
}
