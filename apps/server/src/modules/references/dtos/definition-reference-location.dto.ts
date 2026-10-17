import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

import { ReferenceSurface } from '../types/reference-surface.type';
import { ReferenceVersion } from '../types/reference-version.type';

registerEnumType(ReferenceSurface, { name: 'ReferenceSurface' });
registerEnumType(ReferenceVersion, { name: 'ReferenceVersion' });

@ObjectType('DefinitionReferenceLocation')
export class DefinitionReferenceLocationDTO {
  @Field(() => ReferenceSurface)
  surface: keyof typeof ReferenceSurface;

  /** 1-based step number, on the step surfaces. */
  @Field(() => Int, { nullable: true })
  step?: number;

  /** For a content referrer: which of its live versions holds the reference. */
  @Field(() => ReferenceVersion, { nullable: true })
  version?: keyof typeof ReferenceVersion;
}
