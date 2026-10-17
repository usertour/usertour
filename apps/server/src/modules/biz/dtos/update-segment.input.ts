import { Field, InputType, PickType } from '@nestjs/graphql';
import { IsString, ValidateIf } from 'class-validator';

import type { SegmentChanges } from '../types/segment-changes.type';
import { SegmentDTO } from './segment.dto';

@InputType()
export class UpdateSegment
  extends PickType(SegmentDTO, ['data', 'id', 'columns'], InputType)
  implements SegmentChanges
{
  // A patch: the column settings save sends only `id` and `columns`. The
  // column is not nullable, so an explicit null is rejected rather than
  // handed to the database.
  @Field(() => String, { nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  name?: string;
}
