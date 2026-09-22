import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { SharedModule } from '@/shared/shared.module';
import { Module } from '@nestjs/common';
import { AttributesResolver } from './attributes.resolver';
import { AttributesService } from './services/attributes.service';

@Module({
  imports: [ProjectsModule, SharedModule],
  providers: [AttributesResolver, AttributesService, PermissionGuard],
  exports: [AttributesService],
})
export class AttributesModule {}
