import { Module } from '@nestjs/common';

import { ApiTokenModule } from '@/api-token/api-token.module';
import { AttributesModule } from '@/attributes/attributes.module';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { EventsModule } from '@/events/events.module';

import { ApiAttributeDefinitionsController } from './attribute-definitions/attribute-definitions.controller';
import { ApiAttributeDefinitionsService } from './attribute-definitions/attribute-definitions.service';
import { ApiEventDefinitionsController } from './event-definitions/event-definitions.controller';
import { ApiEventDefinitionsService } from './event-definitions/event-definitions.service';

/**
 * The contract-first v2 public API. A peer of (not nested in) the legacy
 * {@link OpenAPIModule}: each resource is defined by zod schemas that drive
 * request validation, the OpenAPI spec, and the MCP tool binding from one source.
 * Depends only on the domain layer + api-token auth, never on the legacy facade.
 */
@Module({
  imports: [ApiTokenModule, EventsModule, AttributesModule],
  controllers: [ApiEventDefinitionsController, ApiAttributeDefinitionsController],
  providers: [ApiEventDefinitionsService, ApiAttributeDefinitionsService, OpenAPIExceptionFilter],
})
export class ApiModule {}
