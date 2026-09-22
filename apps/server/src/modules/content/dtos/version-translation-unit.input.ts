import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class VersionTranslationUnitInput {
  @Field(() => String)
  path: string;

  // null clears the unit; a blank string keeps the stored translation.
  @Field(() => String, { nullable: true })
  translation?: string | null;
}
