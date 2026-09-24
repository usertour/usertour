import { Field, Int, ObjectType } from '@nestjs/graphql';

import { AdminUserDTO } from './admin-user.dto';

@ObjectType('AdminUserList')
export class AdminUserListDTO {
  @Field(() => [AdminUserDTO])
  items: AdminUserDTO[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  pageSize: number;
}
