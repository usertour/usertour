import { Field, InputType } from '@nestjs/graphql';
import { Role } from '@prisma/client';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  /** EDITOR only: environments the member may publish to (omitted = none). */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedEnvironmentIds?: string[];
}
