import { Reflector } from "@nestjs/core";

export enum RolesScopeEnum {
  ADMIN = "ADMIN",
  USER = "USER",
}
export const Roles = Reflector.createDecorator<RolesScopeEnum[]>();
