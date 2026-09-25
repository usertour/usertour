import { Field, ObjectType } from '@nestjs/graphql';
import { DefinitionReferenceLocationDTO } from './definition-reference-location.dto';

@ObjectType('DefinitionReference')
export class DefinitionReferenceDTO {
  /** content, segment or theme. */
  @Field(() => String)
  referrerKind: string;

  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  contentType?: string;

  /** user or company, for a segment referrer. */
  @Field(() => String, { nullable: true })
  segmentBizType?: string;

  @Field(() => [DefinitionReferenceLocationDTO])
  locations: DefinitionReferenceLocationDTO[];
}
