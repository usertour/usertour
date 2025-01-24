import "reflect-metadata";
import {
  ObjectType,
  registerEnumType,
  HideField,
  Field,
} from "@nestjs/graphql";
import { IsEmail } from "class-validator";
import { Project } from "@/projects/models/project.model";
import { UserOnProject } from "@/projects/models/useronproject.model";
import { BaseModel } from "@/common/models/base.model";
import { Role } from "@prisma/client";

registerEnumType(Role, {
  name: "Role",
  description: "User role",
});

@ObjectType()
export class User extends BaseModel {
  @Field()
  @IsEmail()
  email: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => [UserOnProject])
  projects?: [UserOnProject];

  @HideField()
  password: string;
}
