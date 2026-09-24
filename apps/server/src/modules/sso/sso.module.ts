import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { ProjectsModule } from '@/modules/projects/projects.module';

import { SsoAuthController } from './controllers/sso-auth.controller';
import { SsoOidcService } from './services/sso-oidc.service';
import { SsoService } from './services/sso.service';
import { SsoResolver } from './sso.resolver';

@Module({
  imports: [ProjectsModule, AuthModule],
  controllers: [SsoAuthController],
  providers: [SsoResolver, SsoService, SsoOidcService, PermissionGuard],
  exports: [SsoService],
})
export class SsoModule {}
