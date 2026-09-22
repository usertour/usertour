import { Controller, Get, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { locates } from '@usertour/constants';

import { ApiTokenAuthenticateGuard } from '@/modules/api-token/guards/api-token-authenticate.guard';
import { OpenAPIExceptionFilter } from '@/modules/common/filters/openapi-exception.filter';

import { ApiObjectType } from '../shared/object-type';
import { ApiStandardErrorResponses } from '../shared/error-response';
import { ApiValidationPipe } from '../shared/validation.pipe';
import { ListLocalesResponseDto } from './locales.schema';

/**
 * The locale catalog behind the dashboard's picker, served as data so an API
 * caller or an MCP agent files a new localization under the same tag and
 * language name a human would have picked (see locales.schema).
 *
 * Project-less and capability-less, like `/v2/me`: the answer is a constant.
 */
@ApiTags('Localizations')
@Controller('v2/locales')
@UseGuards(ApiTokenAuthenticateGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
@ApiStandardErrorResponses()
export class ApiLocalesController {
  @Get()
  @ApiOperation({
    summary: 'List locales',
    description:
      'The locale catalog the dashboard offers when adding a localization: a BCP-47 tag with ' +
      'the language name to file it under. Copy a pair from here into `create localization` — ' +
      '`name` is what machine translation is asked to translate into, so a real language name ' +
      'translates better than an improvised one. The catalog is a suggestion, not a ' +
      'vocabulary: `locale` accepts any well-formed tag, and `code` is free-form (custom codes ' +
      'like `fr-enterprise` let one language carry several variants).',
  })
  @ApiResponse({ status: 200, description: 'Locale catalog', type: ListLocalesResponseDto })
  list(): ListLocalesResponseDto {
    return {
      results: locates.map((option) => ({
        object: ApiObjectType.LOCALE as const,
        locale: option.locale,
        name: option.name,
      })),
      next: null,
      previous: null,
    };
  }
}
