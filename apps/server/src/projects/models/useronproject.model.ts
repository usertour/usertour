import { BaseModel } from '@/common/models/base.model';
import { Project } from '@/projects/models/project.model';
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

  @Field(() => Project)
  project: Project;
}
