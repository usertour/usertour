import { EnvironmentsModule } from '@/modules/environments/environments.module';
import { LocalizationsModule } from '@/modules/localizations/localizations.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { CommonModule } from '@/modules/common/common.module';
import { UtilitiesModule } from '@/modules/utilities/utilities.module';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { Module } from '@nestjs/common';
import { ContentResolver, VersionFieldsResolver } from './content.resolver';
import { ContentService } from './services/content.service';
import { VersionTranslationService } from './services/version-translation.service';
import { WebSocketModule } from '@/web-socket/web-socket.module';

@Module({
  imports: [
    ProjectsModule,
    EnvironmentsModule,
    LocalizationsModule,
    WebSocketModule,
    CommonModule,
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
