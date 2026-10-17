import { BaseDTO } from '@/modules/common/dtos/base.dto';
import { IsBoolean, IsInt, IsString } from 'class-validator';
import { Field, Int, ObjectType } from '@nestjs/graphql';

import { AttributeBizTypeScalar } from './attribute-biz-type.scalar';
import { AttributeDataTypeScalar } from './attribute-data-type.scalar';

@ObjectType('Attribute')
export class AttributeDTO extends BaseDTO {
  @Field(() => AttributeBizTypeScalar)
  @IsInt()
  bizType: number;

  @Field(() => String)
  @IsString()
  projectId: string;

  @Field(() => String)
  @IsString()
  displayName: string;

  @Field(() => String)
  @IsString()
  codeName: string;

  // Non-optional on purpose: the Prisma column defaults to '', so a stored
  // attribute always has a description. CreateAttributeInput overrides this
  // field back to optional — creation may omit it and take the default.
  @Field(() => String)
  @IsString()
  description: string;

  @Field(() => AttributeDataTypeScalar)
  @IsInt()
  dataType: number;

  /** Upper bound of a Random number attribute (ADR 0020); meaningless for other types. */
  @Field(() => Int)
  @IsInt()
  randomMax: number;

  @Field(() => Boolean)
  @IsBoolean()
  predefined: boolean;

  /** 'internal' or the owning integration provider (ADR 0013 §6). */
  @Field(() => String)
  @IsString()
  source: string;

  /** Provider-side field name when provider-owned. */
  @Field(() => String, { nullable: true })
  sourceId?: string | null;
}
