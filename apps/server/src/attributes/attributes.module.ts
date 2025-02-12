import { ProjectsModule } from '@/projects/projects.module';
import { Module } from '@nestjs/common';
import { AttributesGuard } from './attributes.guard';
import { AttributesResolver } from './attributes.resolver';
import { AttributesService } from './attributes.service';

@Module({
  imports: [ProjectsModule],
  providers: [AttributesResolver, AttributesService, AttributesGuard],
})
export class AttributesModule {}
