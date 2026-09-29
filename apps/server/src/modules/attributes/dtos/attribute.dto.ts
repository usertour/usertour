import { BaseDTO } from '@/modules/common/dtos/base.dto';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Attribute')
export class AttributeDTO extends BaseDTO {
  @Field(() => Int)
  bizType: number;

  @Field(() => String)
  projectId: string;

  @Field(() => String)
  displayName: string;

  @Field(() => String)
  codeName: string;

  // Non-optional on purpose: the Prisma column defaults to '', so a stored
  // attribute always has a description. CreateAttributeInput overrides this
  // field back to optional — creation may omit it and take the default.
  @Field(() => String)
  description: string;

  @Field(() => Int)
  dataType: number;

  /** Upper bound of a Random number attribute (ADR 0020); meaningless for other types. */
  @Field(() => Int, { nullable: true })
  randomMax?: number | null;

  @Field(() => Boolean)
  predefined: boolean;

  /** 'internal' or the owning integration provider (ADR 0013 §6). */
  @Field(() => String)
  source: string;

  /** Provider-side field name when provider-owned. */
  @Field(() => String, { nullable: true })
  sourceId?: string | null;
}
