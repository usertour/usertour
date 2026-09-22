import { BaseDTO } from '@/modules/common/dtos/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

@ObjectType('Theme')
export class ThemeDTO extends BaseDTO {
  @Field()
  name: string;

  @Field(() => Boolean)
  isDefault: boolean;

  @Field(() => Boolean)
  isSystem: boolean;

  @Field(() => String)
  projectId: string;

  @Field(() => GraphQLJSON)
  settings: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  variations?: JsonValue;
}
