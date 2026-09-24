import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('DefinitionReferenceLocation')
export class DefinitionReferenceLocationDTO {
  /** startRules, hideRules, versionSettings, contentBody, stepTrigger, stepContent, questionBinding, versionTheme, stepTheme, segmentConditions or themeVariations. */
  @Field(() => String)
  surface: string;

  /** 1-based step number, on the step surfaces. */
  @Field(() => Int, { nullable: true })
  step?: number;

  /** draft, published or draftAndPublished, for a content referrer. */
  @Field(() => String, { nullable: true })
  version?: string;
}
