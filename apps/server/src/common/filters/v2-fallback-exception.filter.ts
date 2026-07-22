import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request } from 'express';

import { UnknownRouteError, ValidationError } from '@/common/errors/errors';
import { OpenAPIExceptionFilter } from './openapi-exception.filter';

/**
 * Global fallback that keeps the v2 error ENVELOPE promise for exceptions the
 * controller-scoped OpenAPIExceptionFilter can never see, because they are
 * thrown before any route handler exists:
 *
 *  - a malformed JSON body dies in the express body-parser middleware
 *    (SyntaxError) → previously leaked Nest's bare
 *    `{message, error, statusCode}` shape; now 400 E1017;
 *  - a /v2 path that matches no route (NotFoundException, "Cannot GET ...")
 *    → now 404 E1033.
 *
 * Anything else that leaks to the global layer on a /v2 path is delegated to
 * OpenAPIExceptionFilter so it renders the same envelope as in-route errors.
 * NON-/v2 traffic (GraphQL, v1, websocket upgrade paths) keeps the default
 * Nest behavior untouched.
 */
@Injectable()
@Catch()
export class V2FallbackExceptionFilter extends BaseExceptionFilter {
  constructor(private readonly openApiFilter: OpenAPIExceptionFilter) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      return super.catch(exception, host);
    }
    const request = host.switchToHttp().getRequest<Request>();
    if (!request?.path?.startsWith('/v2')) {
      return super.catch(exception, host);
    }

    // Body-parser JSON failure. Depending on the express/Nest layering it
    // surfaces either as the raw SyntaxError or wrapped in a
    // BadRequestException — and a BadRequestException reaching the GLOBAL
    // layer can only come from middleware (an in-route one is caught by the
    // controller-scoped filter first).
    if (exception instanceof SyntaxError || exception instanceof BadRequestException) {
      const detail =
        exception instanceof BadRequestException
          ? ((exception.getResponse() as any)?.message ?? exception.message)
          : exception.message;
      return this.openApiFilter.catch(new ValidationError(`Invalid JSON body: ${detail}`), host);
    }
    // No route matched. A NotFoundException reaching the GLOBAL layer can only
    // mean route lookup failed — an in-route 404 is caught by the
    // controller-scoped filter first.
    if (exception instanceof NotFoundException) {
      return this.openApiFilter.catch(new UnknownRouteError(), host);
    }
    return this.openApiFilter.catch(exception, host);
  }
}
