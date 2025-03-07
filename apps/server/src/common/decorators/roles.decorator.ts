import { Reflector } from '@nestjs/core';

export enum RolesScopeEnum {
  ADMIN = 'ADMIN',
  USER = 'USER',
  OWNER = 'OWNER',
  VIEWER = 'VIEWER',
}
export const Roles = Reflector.createDecorator<RolesScopeEnum[]>();
