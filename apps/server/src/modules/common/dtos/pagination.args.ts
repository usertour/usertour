import { ArgsType, Field } from '@nestjs/graphql';

import type { Pagination } from '../types/pagination.type';

@ArgsType()
export class PaginationArgs implements Pagination {
  @Field({ nullable: true })
  skip?: number;

  @Field({ nullable: true })
  after?: string;

  @Field({ nullable: true })
  before?: string;

  @Field({ nullable: true })
  first?: number;

  @Field({ nullable: true })
  last?: number;
}
