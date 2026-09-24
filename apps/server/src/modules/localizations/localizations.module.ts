import { AiModule } from '@/modules/ai/ai.module';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { CommonModule } from '@/modules/common/common.module';
import { Module } from '@nestjs/common';
import { LocalizationsResolver } from './localizations.resolver';
import { LocalizationsService } from './services/localizations.service';
import { MachineTranslationService } from './services/machine-translation.service';

@Module({
  imports: [ProjectsModule, AiModule, CommonModule],
  providers: [
    LocalizationsResolver,
    LocalizationsService,
    MachineTranslationService,
    PermissionGuard,
  ],
  exports: [LocalizationsService],
})
export class LocalizationsModule {}
