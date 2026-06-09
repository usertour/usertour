import { Module } from '@nestjs/common';

import { ApiTokenModule } from '@/api-token/api-token.module';
import { AttributesModule } from '@/attributes/attributes.module';
import { BizModule } from '@/biz/biz.module';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';
import { ContentModule } from '@/content/content.module';
import { EventsModule } from '@/events/events.module';

import { ApiAttributeDefinitionsController } from './attribute-definitions/attribute-definitions.controller';
import { ApiAttributeDefinitionsService } from './attribute-definitions/attribute-definitions.service';
import { ApiContentController } from './content/content.controller';
import { ApiContentService } from './content/content.service';
import { ApiContentVersionsController } from './content-versions/content-versions.controller';
import { ApiContentVersionsService } from './content-versions/content-versions.service';
import { ApiEventDefinitionsController } from './event-definitions/event-definitions.controller';
import { ApiEventDefinitionsService } from './event-definitions/event-definitions.service';
import { ApiUsersController } from './users/users.controller';
import { ApiUsersService } from './users/users.service';

/**
 * The contract-first v2 public API. A peer of (not nested in) the legacy
 * {@link OpenAPIModule}: each resource is defined by zod schemas that drive
 * request validation, the OpenAPI spec, and the MCP tool binding from one source.
 * Depends only on the domain layer + api-token auth, never on the legacy facade.
 */
@Module({
  imports: [ApiTokenModule, EventsModule, AttributesModule, ContentModule, BizModule],
  controllers: [
    ApiEventDefinitionsController,
    ApiAttributeDefinitionsController,
    ApiContentController,
    ApiContentVersionsController,
    ApiUsersController,
  ],
  providers: [
    ApiEventDefinitionsService,
    ApiAttributeDefinitionsService,
    ApiContentService,
    ApiContentVersionsService,
    ApiUsersService,
    OpenAPIExceptionFilter,
  ],
})
export class ApiModule {}
