import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Capability } from '@usertour/types';

import { ApiTokenGuard } from '@/modules/api-token/guards/api-token.guard';
import { RequireCapability } from '@/modules/api-token/decorators/require-capability.decorator';
import { OpenAPIExceptionFilter } from '@/modules/common/filters/openapi-exception.filter';

import { ApiStandardErrorResponses, ErrorResponseDto } from '../shared/error-response';
import { ApiValidationPipe } from '../shared/validation.pipe';
import {
  CreateLocalizationBodyDto,
  CreatedLocalizationDto,
  ListLocalizationsQueryDto,
  ListLocalizationsResponseDto,
  LocalizationDto,
  UpdateLocalizationBodyDto,
  UpdateVersionLocalizationBodyDto,
  VersionLocalizationDto,
} from './localizations.schema';
import { ApiLocalizationsService } from './localizations.service';

/**
 * The project's locales — a settings-level resource with its own capability
 * family (localization:*), like themes or environments. A version's
 * TRANSLATION is a different resource: it belongs to the version and rides the
 * content capabilities (see ApiVersionLocalizationsController).
 *
 * The default locale (the source language) can be renamed but neither deleted
 * nor reassigned here — switching it has project-wide side effects.
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
  @RequireCapability(Capability.LocalizationRead)
  @ApiOperation({
    summary: 'List localizations',
    description:
      'The locales this project translates content into. The `isDefault` one is the source ' +
      'language; every other `code` can carry a translation on each content version — read ' +
      "and write those with the version's translation endpoints under Content versions. " +
      '`deleted=true` lists the soft-deleted ones instead.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'List of localizations',
    type: ListLocalizationsResponseDto,
  })
  async list(@Param('projectId') projectId: string, @Query() query: ListLocalizationsQueryDto) {
    return this.service.list(projectId, query);
  }

  @Post()
  @RequireCapability(Capability.LocalizationCreate)
  @ApiOperation({
    summary: 'Create a localization',
    description:
      'Add a locale content can be translated into. A `code` stays reserved while its ' +
      'localization is soft-deleted: creating that code again RESTORES the deleted one — same ' +
      'id, with every translation it held (each with the enabled state it had) — and the ' +
      'response says so with `restored: true`.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Created localization', type: CreatedLocalizationDto })
  @ApiResponse({
    status: 409,
    description: 'E1023 a live localization already uses this code',
    type: ErrorResponseDto,
  })
  async create(@Param('projectId') projectId: string, @Body() body: CreateLocalizationBodyDto) {
    return this.service.create(projectId, body);
  }

  @Patch(':id')
  @RequireCapability(Capability.LocalizationUpdate)
  @ApiOperation({
    summary: 'Update a localization',
    description:
      'Rename a locale or change its locale tag / code. Changing `code` takes effect on live ' +
      'content at once: delivery picks a translation by matching it against the end ' +
      "user's `locale_code` attribute, so users carrying the old code fall back to the source " +
      'language until their attribute matches the new one.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Localization ID' })
  @ApiResponse({ status: 200, description: 'Updated localization', type: LocalizationDto })
  @ApiResponse({ status: 404, description: 'Localization not found', type: ErrorResponseDto })
  @ApiResponse({
    status: 409,
    description:
      'E1023 another localization already uses this code (a soft-deleted one keeps its code ' +
      'reserved until it is restored)',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() body: UpdateLocalizationBodyDto,
  ) {
    return this.service.update(id, projectId, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireCapability(Capability.LocalizationDelete)
  @ApiOperation({
    summary: 'Delete a localization',
    description:
      'Soft delete. The locale stops being offered and delivered at once — its users see the ' +
      'source language — but the translations it holds on every version are kept, so ' +
      'restoring it brings them all back. The default localization cannot be deleted.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Localization ID' })
  @ApiResponse({ status: 204, description: 'Localization deleted' })
  @ApiResponse({ status: 404, description: 'Localization not found', type: ErrorResponseDto })
  @ApiResponse({
    status: 409,
    description: 'E1041 the default localization cannot be deleted',
    type: ErrorResponseDto,
  })
  async delete(@Param('id') id: string, @Param('projectId') projectId: string) {
    await this.service.delete(id, projectId);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @RequireCapability(Capability.LocalizationUpdate)
  @ApiOperation({
    summary: 'Restore a deleted localization',
    description:
      'Bring a soft-deleted locale back exactly as it was: every version translation it held ' +
      'returns with the enabled state it had, so enabled translations on published versions ' +
      'are delivered again at once.',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Localization ID (of a deleted localization)' })
  @ApiResponse({ status: 200, description: 'Restored localization', type: LocalizationDto })
  @ApiResponse({
    status: 404,
    description: 'No deleted localization with this id',
    type: ErrorResponseDto,
  })
  async restore(@Param('id') id: string, @Param('projectId') projectId: string) {
    return this.service.restore(id, projectId);
  }
}

/**
 * A version's translations. Grouped with the content-version endpoints on
 * purpose: a translation is part of the version — it forks, restores and ships
 * with it, and follows the same editable-draft rule — like member routes sit
 * with their parent resource.
 */
@ApiTags('Content versions')
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
    summary: 'Get a translation',
    description:
      'Every translatable unit of the version for one locale: source text, current ' +
      'translation, and whether the source changed since it was translated (`outdated`). ' +
      'A locale that was never translated returns all units with empty translations. The ' +
      "`code` is one of the project's non-default locales — see List localizations.",
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
    summary: 'Update a translation',
    description:
      'Write translations by unit path and/or switch delivery on or off. Only an editable ' +
      'draft accepts translations — fork a published version first (the fork carries every ' +
      'translation with it). Translations merge onto the stored ones server-side; the ' +
      "response is the full translation as now stored. The `code` is one of the project's " +
      'non-default locales — see List localizations.',
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
