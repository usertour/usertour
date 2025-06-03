import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class Integration extends BaseModel {
  @Field()
  code: string;

  @Field()
  key: string;

  @Field()
  accessToken: string;

  @Field(() => GraphQLJSON, { nullable: true })
  config: JsonValue;

  @Field()
  enabled: boolean;

  @Field()
  environmentId: string;
}
