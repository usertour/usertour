import { BaseModel } from '@/common/models/base.model';
import { Project } from '@/projects/models/project.model';
import { User } from '@/users/models/user.model';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Invite extends BaseModel {
  // Nullable because the public `getInvite` query strips identifying fields
  // (email, code, ids) before returning — only admin queries get the full row.
  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  code?: string;

  @Field(() => Boolean, { nullable: false })
  expired: boolean;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: false })
  role: string;

  @Field(() => String, { nullable: true })
  userId?: string;

  @Field(() => String, { nullable: true })
  projectId?: string;

  /**
   * True when a Usertour account already exists for `email`. Lets the invite
   * page render the right surface (sign-in vs sign-up) without forcing the
   * user to pick.
   */
  @Field(() => Boolean, { nullable: false })
  recipientExists: boolean;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => Project, { nullable: true })
  project?: Project;
}
