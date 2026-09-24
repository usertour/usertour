import { Field, Int, ObjectType } from '@nestjs/graphql';

import { AdminProjectDTO } from './admin-project.dto';

@ObjectType('AdminProjectList')
export class AdminProjectListDTO {
  @Field(() => [AdminProjectDTO])
  items: AdminProjectDTO[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  pageSize: number;
}
