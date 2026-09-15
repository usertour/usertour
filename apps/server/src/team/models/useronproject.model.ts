import { BaseModel } from '@/common/models/base.model';
import { Project } from '@/projects/models/project.model';
import { User } from '@/users/models/user.model';
import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Role } from '@prisma/client';

registerEnumType(Role, {
  name: 'Role',
  description: 'User role',
});

@ObjectType()
export class UserOnProject extends BaseModel {
  @Field(() => Role)
  role: Role;

  @Field()
  actived: boolean;

  /**
   * EDITOR publish whitelist: environments this member may publish to. Not
   * consulted for other roles (ADMIN / OWNER publish anywhere); null is
   * treated as empty — may publish nowhere.
   */
  @Field(() => [String], { nullable: true })
  allowedEnvironmentIds?: string[] | null;

  @Field(() => Project)
  project: Project;

  @Field(() => User, { nullable: true })
  user?: User;
}
