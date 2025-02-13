import { EnvironmentsModule } from '@/environments/environments.module';
import { LocalizationsModule } from '@/localizations/localizations.module';
import { ProjectsModule } from '@/projects/projects.module';
import { Module } from '@nestjs/common';
import { ContentsGuard } from './contents.guard';
import { ContentsResolver } from './contents.resolver';
import { ContentsService } from './contents.service';

@Module({
  imports: [ProjectsModule, EnvironmentsModule, LocalizationsModule],
  providers: [ContentsResolver, ContentsService, ContentsGuard],
  exports: [ContentsService],
})
export class ContentsModule {}
