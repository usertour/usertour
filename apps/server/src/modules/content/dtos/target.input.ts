import { InputType, PartialType } from '@nestjs/graphql';

import { TargetModelDTO } from './target-model.dto';

@InputType()
export class TargetInput extends PartialType(TargetModelDTO, InputType) {}
