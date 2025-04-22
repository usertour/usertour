import { ProjectsModule } from '@/projects/projects.module';
import { Module } from '@nestjs/common';
import { IntegrationsResolver } from './integrations.resolver';
import { IntegrationsService } from './integrations.service';
import { IntegrationsGuard } from './integrations.guard';

@Module({
  imports: [ProjectsModule],
  providers: [IntegrationsResolver, IntegrationsService, IntegrationsGuard],
})
export class IntegrationsModule {}
