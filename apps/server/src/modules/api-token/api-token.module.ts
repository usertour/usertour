import { Module } from '@nestjs/common';

import { ApiTokenResolver } from './api-token.resolver';
import { ApiTokenGuard } from './guards/api-token.guard';
import { ApiTokenAuthService } from './services/api-token-auth.service';
import { ApiTokenService } from './services/api-token.service';

/**
 * API token foundation: the token store/management service, the self-service
 * GraphQL resolver, the shared auth primitives, and the request guard for v2
 * OpenAPI routes. PrismaService is global (nestjs-prisma), so it needs no
 * import here.
 */
@Module({
  providers: [ApiTokenService, ApiTokenAuthService, ApiTokenResolver, ApiTokenGuard],
  exports: [ApiTokenService, ApiTokenAuthService, ApiTokenGuard],
})
export class ApiTokenModule {}
