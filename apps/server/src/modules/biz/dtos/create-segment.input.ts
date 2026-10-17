import { Field, InputType, OmitType } from '@nestjs/graphql';
import { IsString, ValidateIf } from 'class-validator';

import type { NewSegment } from '../types/new-segment.type';
import { SegmentDTO } from './segment.dto';

@InputType()
export class CreatSegment
  extends OmitType(SegmentDTO, ['id', 'createdAt', 'updatedAt', 'name', 'source'], InputType)
  implements NewSegment
{
  // The model's name is non-null (the column defaults to ''); creation may omit
  // it, but an explicit null is rejected rather than handed to the database.
  @Field(() => String, { nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  name?: string;

  // The model's source is non-null (the column defaults to 'internal');
  // creation may omit it, but an explicit null is rejected rather than handed
  // to the database.
  @Field(() => String, { nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  source?: string;
}
