import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { EncryptionService } from './encryption.service';

@Module({
  providers: [RedisService, EncryptionService],
  exports: [RedisService, EncryptionService],
})
export class SharedModule {}
