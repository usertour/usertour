import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RedisService } from './redis.service';
import { EncryptionService } from './encryption.service';
import { ProjectCacheService } from './project-cache.service';
import { IdentityVerificationService } from './identity-verification.service';

@Module({
  // JwtModule carries no global secret here — identity tokens are verified
  // against per-environment signing secrets passed per call.
  imports: [JwtModule.register({})],
  providers: [RedisService, EncryptionService, ProjectCacheService, IdentityVerificationService],
  exports: [RedisService, EncryptionService, ProjectCacheService, IdentityVerificationService],
})
export class SharedModule {}
