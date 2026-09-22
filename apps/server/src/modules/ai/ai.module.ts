import { Module } from '@nestjs/common';

import { AiService } from './services/ai.service';

@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
