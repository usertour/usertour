import { Controller, Get, Req, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthedApiToken } from '@/api-token/api-token-auth.service';
import { ApiTokenAuthenticateGuard } from '@/api-token/api-token-authenticate.guard';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { ApiStandardErrorResponses } from '../shared/error-response';
import { ApiValidationPipe } from '../shared/validation.pipe';
import { MeResponseDto } from './me.schema';
import { ApiMeService } from './me.service';

/**
 * Token introspection — the one v2 route with no project in the path, behind
 * the authenticate-only guard. Integration platforms use it as the
 * credential-test call and to populate project/environment pickers.
 */
@ApiTags('Me')
@Controller('v2/me')
@UseGuards(ApiTokenAuthenticateGuard)
@UseFilters(OpenAPIExceptionFilter)
@UsePipes(ApiValidationPipe)
@ApiBearerAuth()
@ApiStandardErrorResponses()
export class ApiMeController {
  constructor(private readonly service: ApiMeService) {}

  @Get()
  @ApiOperation({
    summary: 'Introspect the token: its name and the projects/environments it may act on',
  })
  @ApiResponse({ status: 200, description: 'Token scope', type: MeResponseDto })
  async me(@Req() request: { apiToken: AuthedApiToken }): Promise<MeResponseDto> {
    return await this.service.resolve(request.apiToken);
  }
}
