import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import { ReferenceReferrerKind } from '../types/reference-referrer-kind.type';
import { ReferenceSegmentBizType } from '../types/reference-segment-biz-type.type';
import { DefinitionReferenceLocationDTO } from './definition-reference-location.dto';

registerEnumType(ReferenceReferrerKind, { name: 'ReferenceReferrerKind' });
registerEnumType(ReferenceSegmentBizType, { name: 'ReferenceSegmentBizType' });

@ObjectType('DefinitionReference')
export class DefinitionReferenceDTO {
  @Field(() => ReferenceReferrerKind)
  referrerKind: keyof typeof ReferenceReferrerKind;

  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  contentType?: string;

  /** For a segment referrer: whose segment list it lives in. */
  @Field(() => ReferenceSegmentBizType, { nullable: true })
  segmentBizType?: keyof typeof ReferenceSegmentBizType;

  @Field(() => [DefinitionReferenceLocationDTO])
  locations: DefinitionReferenceLocationDTO[];
}
