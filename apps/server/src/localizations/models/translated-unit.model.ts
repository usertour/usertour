import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TranslatedUnit {
  @Field(() => String)
  path: string;

  @Field(() => String)
  translatedText: string;
}
