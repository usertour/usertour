import { Field, InputType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import type { BizFilter } from '../types/biz-filter.type';

@InputType()
export class BizQuery implements BizFilter {
  @Field(() => String, { nullable: true })
  environmentId: string;

  @Field(() => String, { nullable: true })
  segmentId?: string;

  @Field(() => String, { nullable: true })
  userId?: string;

  @Field(() => String, { nullable: true })
  companyId?: string;

  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;
}
