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
import { OpenAPIError } from '@/common/errors/errors';

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
