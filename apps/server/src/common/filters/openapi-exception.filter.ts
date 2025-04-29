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
import { OpenAPIError } from '../errors/errors';

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
      message =
        typeof errorResponse === 'string'
          ? errorResponse
          : errorResponse?.message || 'An error occurred';
      errorCode = 'internal_server_error';
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
      errorCode = 'internal_server_error';
      message = 'An unexpected error occurred';
    }

    // Log error
    this.logger.warn(
      `Request: ${request.method} ${request.url} OpenAPI error: ${message}, ` +
        `code: ${errorCode}, status: ${status}`,
    );

    // Return unified OpenAPI error response
    return response.status(status).json({
      error: {
        code: errorCode,
        message,
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
