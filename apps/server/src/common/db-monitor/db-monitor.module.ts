import { Module } from '@nestjs/common';
import { DbMonitorService } from './db-monitor.service';

@Module({
  providers: [DbMonitorService],
  exports: [DbMonitorService],
})
export class DbMonitorModule {}
