import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { OpenAPIError, ValidationError } from '@/common/errors/errors';
import { ExpiredApiKeyError, InvalidApiKeyError, MissingApiKeyError } from '@/common/errors';
import { resolveOrigin } from '@/common/http/resolve-origin';

@Catch()
export class OpenAPIExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(OpenAPIExceptionFilter.name);
  private readonly docUrl: string;

  constructor(private configService: ConfigService) {
    this.docUrl = this.configService.get<string>('app.docUrl') || 'https://docs.usertour.com';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: HttpStatus;
    let errorCode: string;
    let message: string;

    // Handle HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse() as any;

      // Handle ValidationError
      if (Array.isArray(errorResponse.message)) {
        status = HttpStatus.BAD_REQUEST;
        errorCode = 'E1017'; // ValidationError
        message = errorResponse.message[0];
      } else {
        message =
          typeof errorResponse === 'string'
            ? errorResponse
            : errorResponse?.message || 'An error occurred';
        errorCode = 'E0000'; // UnknownError
      }
    }
    // Handle OpenAPIError
    else if (exception instanceof OpenAPIError) {
      status = exception.statusCode;
      errorCode = exception.code;
      message = this.getErrorMessage(exception, request);
    }
    // Handle other errors
    else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'E0000'; // UnknownError
      message = 'An unexpected error occurred';
    }

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(exception);
    }

    // MCP Resource Server (RFC 9728): any auth failure on `/mcp` is reported as
    // 401 + a `WWW-Authenticate` pointing at the protected-resource metadata, so
    // an MCP client knows to (re)run the OAuth flow. We normalize here — some
    // token errors are 403 on the v2 REST surface (kept) but must be 401 for MCP.
    const isAuthError =
      exception instanceof MissingApiKeyError ||
      exception instanceof InvalidApiKeyError ||
      exception instanceof ExpiredApiKeyError;
    if (isAuthError && request.path.replace(/\/+$/, '') === '/mcp') {
      status = HttpStatus.UNAUTHORIZED;
      const origin = resolveOrigin(this.configService, request);
      response.setHeader(
        'WWW-Authenticate',
        `Bearer realm="OAuth", resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp", error="invalid_token"`,
      );
    }

    // Log error
    this.logger.warn(
      `Request: ${request.method} ${request.url} OpenAPI error: ${message}, ` +
        `code: ${errorCode}, status: ${status}`,
    );

    // Return unified OpenAPI error response. A ValidationError may carry
    // structured issues (rule / message / path per problem) — include them so
    // clients can fix everything in one round-trip instead of one error at a time.
    const issues = exception instanceof ValidationError ? exception.issues : undefined;
    return response.status(status).json({
      error: {
        code: errorCode,
        message,
        ...(issues?.length ? { issues } : {}),
        doc_url: this.docUrl,
      },
    });
  }

  // Get error message with language support
  private getErrorMessage(error: OpenAPIError, request: Request): string {
    const acceptLanguage = request.headers['accept-language'];
    return error.getMessage(acceptLanguage);
  }
}
