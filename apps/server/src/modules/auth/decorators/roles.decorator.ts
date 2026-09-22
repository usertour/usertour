import { Reflector } from '@nestjs/core';

export enum RolesScopeEnum {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  OWNER = 'OWNER',
  VIEWER = 'VIEWER',
}
export const Roles = Reflector.createDecorator<RolesScopeEnum[]>();
