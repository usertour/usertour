import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { EncryptionService } from './encryption.service';
import { ProjectCacheService } from './project-cache.service';

@Module({
  providers: [RedisService, EncryptionService, ProjectCacheService],
  exports: [RedisService, EncryptionService, ProjectCacheService],
})
export class SharedModule {}
