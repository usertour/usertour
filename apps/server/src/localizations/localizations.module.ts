import { ProjectsModule } from '@/projects/projects.module';
import { Module } from '@nestjs/common';
import { LocalizationsGuard } from './localizations.guard';
import { LocalizationsResolver } from './localizations.resolver';
import { LocalizationsService } from './localizations.service';

@Module({
  imports: [ProjectsModule],
  providers: [LocalizationsResolver, LocalizationsService, LocalizationsGuard],
  exports: [LocalizationsService],
})
export class LocalizationsModule {}
