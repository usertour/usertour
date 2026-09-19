import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class TranslationUnitInput {
  @Field(() => String)
  path: string;

  @Field(() => String)
  sourceText: string;
}
