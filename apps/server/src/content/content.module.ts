import { EnvironmentsModule } from '@/modules/environments/environments.module';
import { LocalizationsModule } from '@/modules/localizations/localizations.module';
import { ProjectsModule } from '@/projects/projects.module';
import { SharedModule } from '@/shared/shared.module';
import { UtilitiesModule } from '@/utilities/utilities.module';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { Module } from '@nestjs/common';
import { ContentResolver, VersionFieldsResolver } from './content.resolver';
import { ContentService } from './content.service';
import { VersionTranslationService } from './version-translation.service';
import { WebSocketModule } from '@/web-socket/web-socket.module';

@Module({
  imports: [
    ProjectsModule,
    EnvironmentsModule,
    LocalizationsModule,
    WebSocketModule,
    SharedModule,
    UtilitiesModule,
  ],
  providers: [
    ContentResolver,
    VersionFieldsResolver,
    ContentService,
    VersionTranslationService,
    PermissionGuard,
  ],
  exports: [ContentService, VersionTranslationService],
})
export class ContentModule {}
