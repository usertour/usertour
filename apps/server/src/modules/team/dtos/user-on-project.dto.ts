import { BaseModel } from '@/common/models/base.model';
import { ProjectDTO } from '@/modules/projects/dtos/project.dto';
import { UserDTO } from '@/modules/users/dtos/user.dto';
import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Role } from '@prisma/client';

registerEnumType(Role, {
  name: 'Role',
  description: 'User role',
});

@ObjectType('UserOnProject')
export class UserOnProjectDTO extends BaseModel {
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

  @Field(() => ProjectDTO)
  project: ProjectDTO;

  @Field(() => UserDTO, { nullable: true })
  user?: UserDTO;
}
