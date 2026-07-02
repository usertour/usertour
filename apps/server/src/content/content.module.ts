import { EnvironmentsModule } from '@/environments/environments.module';
import { LocalizationsModule } from '@/localizations/localizations.module';
import { ProjectsModule } from '@/projects/projects.module';
import { SharedModule } from '@/shared/shared.module';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { Module } from '@nestjs/common';
import { ContentResolver, VersionFieldsResolver } from './content.resolver';
import { ContentService } from './content.service';
import { WebSocketModule } from '@/web-socket/web-socket.module';

@Module({
  imports: [ProjectsModule, EnvironmentsModule, LocalizationsModule, WebSocketModule, SharedModule],
  providers: [ContentResolver, VersionFieldsResolver, ContentService, PermissionGuard],
  exports: [ContentService],
})
export class ContentModule {}
