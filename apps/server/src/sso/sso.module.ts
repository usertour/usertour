import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { ProjectsModule } from '@/projects/projects.module';

import { SsoAuthController } from './sso-auth.controller';
import { SsoOidcService } from './sso-oidc.service';
import { SsoResolver } from './sso.resolver';
import { SsoService } from './sso.service';

@Module({
  imports: [ProjectsModule, AuthModule],
  controllers: [SsoAuthController],
  providers: [SsoResolver, SsoService, SsoOidcService, PermissionGuard],
  exports: [SsoService],
})
export class SsoModule {}
