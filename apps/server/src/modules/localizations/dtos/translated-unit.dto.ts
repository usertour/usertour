import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('TranslatedUnit')
export class TranslatedUnitDTO {
  @Field(() => String)
  path: string;

  @Field(() => String)
  translatedText: string;
}
