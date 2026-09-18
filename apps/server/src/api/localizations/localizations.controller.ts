import { Body, Controller, Get, Param, Put, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/api-token/api-token.guard';
import { RequireCapability } from '@/api-token/require-capability.decorator';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ApiStandardErrorResponses, ErrorResponseDto } from '../shared/error-response';
import { ApiValidationPipe } from '../shared/validation.pipe';
import {
  ListLocalizationsResponseDto,
  UpdateVersionLocalizationBodyDto,
  VersionLocalizationDto,
} from './localizations.schema';
import { ApiLocalizationsService } from './localizations.service';

/**
 * The project's locales — read-only here (they are one-time project setup in
 * the dashboard). Gated by content:read: the list is the prerequisite for
 * reading or writing any version translation, not a resource of its own.
 */
@ApiTags('Localizations')
@ApiStandardErrorResponses()
@Controller('v2/projects/:projectId/localizations')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiLocalizationsController {
  constructor(private readonly service: ApiLocalizationsService) {}

  @Get()
  @RequireCapability(Capability.ContentRead)
  @ApiOperation({
    summary: 'List localizations',
    description:
      'The locales this project translates content into. The `isDefault` one is the source ' +
      'language; every other `code` can carry a translation on each content version.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'List of localizations',
    type: ListLocalizationsResponseDto,
  })
  async list(@Param('projectId') projectId: string) {
    return this.service.list(projectId);
  }
}

@ApiTags('Localizations')
@ApiStandardErrorResponses()
@Controller('v2/projects/:projectId/content/:contentId/versions/:versionId/localizations')
@UseGuards(ApiTokenGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
export class ApiVersionLocalizationsController {
  constructor(private readonly service: ApiLocalizationsService) {}

  @Get(':code')
  @RequireCapability(Capability.ContentRead)
  @ApiOperation({
    summary: "Get a version's translation",
    description:
      'Every translatable unit of the version for one locale: source text, current ' +
      'translation, and whether the source changed since it was translated (`outdated`). ' +
      'A locale that was never translated returns all units with empty translations.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'contentId', description: 'Content ID' })
  @ApiParam({ name: 'versionId', description: 'Content version ID' })
  @ApiParam({ name: 'code', description: 'Localization code (not the default locale)' })
  @ApiResponse({ status: 200, description: 'Version translation', type: VersionLocalizationDto })
  @ApiResponse({
    status: 404,
    description: 'Content version or localization not found',
    type: ErrorResponseDto,
  })
  async get(
    @Param('projectId') projectId: string,
    @Param('contentId') contentId: string,
    @Param('versionId') versionId: string,
    @Param('code') code: string,
  ) {
    return this.service.getVersionLocalization(versionId, contentId, projectId, code);
  }

  @Put(':code')
  @RequireCapability(Capability.ContentUpdate)
  @ApiOperation({
    summary: "Update a version's translation",
    description:
      'Write translations by unit path and/or switch delivery on or off. Only an editable ' +
      'draft accepts translations — fork a published version first (the fork carries every ' +
      'translation with it). Translations merge onto the stored ones server-side; the ' +
      'response is the full translation as now stored.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'contentId', description: 'Content ID' })
  @ApiParam({ name: 'versionId', description: 'Content version ID' })
  @ApiParam({ name: 'code', description: 'Localization code (not the default locale)' })
  @ApiResponse({ status: 200, description: 'Updated translation', type: VersionLocalizationDto })
  @ApiResponse({
    status: 404,
    description: 'Content version or localization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'E0049 the version is published (read-only — fork an editable draft first).',
    type: ErrorResponseDto,
  })
  async update(
    @Param('projectId') projectId: string,
    @Param('contentId') contentId: string,
    @Param('versionId') versionId: string,
    @Param('code') code: string,
    @Body() body: UpdateVersionLocalizationBodyDto,
  ) {
    return this.service.updateVersionLocalization(versionId, contentId, projectId, code, body);
  }
}
