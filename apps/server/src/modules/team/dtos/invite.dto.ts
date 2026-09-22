import { BaseModel } from '@/common/models/base.model';
import { ProjectDTO } from '@/modules/projects/dtos/project.dto';
import { UserDTO } from '@/modules/users/dtos/user.dto';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Invite')
export class InviteDTO extends BaseModel {
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
   * page render the right surface (log-in vs sign-up) without forcing the
   * user to pick.
   */
  @Field(() => Boolean, { nullable: false })
  recipientExists: boolean;

  /**
   * Whether the invite's project enforces SSO. The invite page uses it to show
   * only the SSO option (password/social would be force-blocked after joining).
   */
  @Field(() => Boolean, { nullable: false })
  requireSso: boolean;

  /**
   * EDITOR publish whitelist copied onto the membership on accept:
   * environments the invitee may publish to. Ignored for other roles; null =
   * none.
   */
  @Field(() => [String], { nullable: true })
  allowedEnvironmentIds?: string[] | null;

  @Field(() => UserDTO, { nullable: true })
  user?: UserDTO;

  @Field(() => ProjectDTO, { nullable: true })
  project?: ProjectDTO;
}
