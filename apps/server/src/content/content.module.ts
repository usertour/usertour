import { EnvironmentsModule } from '@/environments/environments.module';
import { LocalizationsModule } from '@/localizations/localizations.module';
import { ProjectsModule } from '@/projects/projects.module';
import { Module } from '@nestjs/common';
import { ContentGuard } from './content.guard';
import { ContentResolver } from './content.resolver';
import { ContentService } from './content.service';
import { WebSocketModule } from '@/web-socket/web-socket.module';

@Module({
  imports: [ProjectsModule, EnvironmentsModule, LocalizationsModule, WebSocketModule],
  providers: [ContentResolver, ContentService, ContentGuard],
  exports: [ContentService],
})
export class ContentModule {}
