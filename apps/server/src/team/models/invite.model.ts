import { BaseModel } from '@/common/models/base.model';
import { Project } from '@/projects/models/project.model';
import { User } from '@/users/models/user.model';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Invite extends BaseModel {
  @Field(() => String, { nullable: false })
  email: string;

  @Field(() => String, { nullable: false })
  code: string;

  @Field(() => Boolean, { nullable: false })
  expired: boolean;

  @Field(() => String, { nullable: false })
  name: string;

  @Field(() => String, { nullable: false })
  role: string;

  @Field(() => String, { nullable: false })
  userId: string;

  @Field(() => String, { nullable: false })
  projectId: string;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => Project, { nullable: true })
  project?: Project;
}
