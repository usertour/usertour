import { AiModule } from '@/ai/ai.module';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { ProjectsModule } from '@/projects/projects.module';
import { Module } from '@nestjs/common';
import { LocalizationsResolver } from './localizations.resolver';
import { LocalizationsService } from './localizations.service';
import { MachineTranslationService } from './machine-translation.service';

@Module({
  imports: [ProjectsModule, AiModule],
  providers: [
    LocalizationsResolver,
    LocalizationsService,
    MachineTranslationService,
    PermissionGuard,
  ],
  exports: [LocalizationsService],
})
export class LocalizationsModule {}
