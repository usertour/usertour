import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';
import { registerEnumType } from '@nestjs/graphql';

registerEnumType(Role, {
  name: 'Role',
  description: 'User role',
});

@InputType()
export class InviteTeamMemberInput {
  @Field(() => String, { nullable: false })
  @IsEmail()
  email: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  name: string;

  @Field(() => Role, { nullable: false })
  @IsNotEmpty()
  role: Role;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  projectId: string;

  /** Environments the member may act on. Omitted/null = all environments. */
  @Field(() => [String], { nullable: true })
  environmentIds?: string[];
}

@InputType()
export class RemoveTeamMemberInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  projectId: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  userId: string;
}

@InputType()
export class ChangeTeamMemberRoleInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  projectId: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  userId: string;

  @Field(() => Role, { nullable: false })
  @IsNotEmpty()
  role: Role;

  /** Omitted = keep current restriction; null = all environments; array = set. */
  @Field(() => [String], { nullable: true })
  environmentIds?: string[] | null;
}

@InputType()
export class CancelInviteInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  inviteId: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  projectId: string;
}

@InputType()
export class ActiveUserProjectInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  userId: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  projectId: string;
}
