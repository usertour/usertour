import { Module } from '@nestjs/common';

import { ApiTokenGuard } from './api-token.guard';
import { ApiTokenResolver } from './api-token.resolver';
import { ApiTokenService } from './api-token.service';

/**
 * API token foundation: the token store/management service, the self-service
 * GraphQL resolver, and the request guard for v2 OpenAPI routes. PrismaService
 * is global (nestjs-prisma), so it needs no import here.
 */
@Module({
  providers: [ApiTokenService, ApiTokenResolver, ApiTokenGuard],
  exports: [ApiTokenService, ApiTokenGuard],
})
export class ApiTokenModule {}
