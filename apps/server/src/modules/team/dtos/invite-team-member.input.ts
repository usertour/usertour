import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { Role } from '@prisma/client';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  /** EDITOR only: environments the member may publish to (omitted = none). */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedEnvironmentIds?: string[];
}
