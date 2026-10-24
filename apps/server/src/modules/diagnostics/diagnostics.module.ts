import { Module } from '@nestjs/common';
import { HeapDiagnosticsService } from './heap-diagnostics.service';

@Module({
  providers: [HeapDiagnosticsService],
})
export class DiagnosticsModule {}
