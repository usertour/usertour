import {
  Field,
  HideField,
  ObjectType,
  registerEnumType,
} from "@nestjs/graphql";
import { BaseModel } from "@/common/models/base.model";
import { Role } from "@prisma/client";
import { Project } from "@/projects/models/project.model";

registerEnumType(Role, {
  name: "Role",
  description: "User role",
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
