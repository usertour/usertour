import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RedisService } from './services/redis.service';
import { EmailService } from './services/email.service';
import { EncryptionService } from './services/encryption.service';
import { ProjectCacheService } from './services/project-cache.service';
import { IdentityVerificationService } from './services/identity-verification.service';

@Module({
  // JwtModule carries no global secret here — identity tokens are verified
  // against per-environment signing secrets passed per call.
  imports: [JwtModule.register({})],
  providers: [
    RedisService,
    EmailService,
    EncryptionService,
    ProjectCacheService,
    IdentityVerificationService,
  ],
  exports: [
    RedisService,
    EmailService,
    EncryptionService,
    ProjectCacheService,
    IdentityVerificationService,
  ],
})
export class CommonModule {}
