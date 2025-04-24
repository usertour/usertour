import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { OpenAPIErrors } from '../constants/errors';

interface OpenAPIErrorResponse {
  error: {
    code: string;
    message: string;
    doc_url?: string;
  };
}

@Catch()
export class OpenAPIExceptionFilter implements ExceptionFilter {
  private readonly docUrl: string;

  constructor(private configService: ConfigService) {
    this.docUrl = this.configService.get<string>('app.docUrl') || 'https://docs.usertour.com';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = OpenAPIErrors.COMMON.INTERNAL_SERVER_ERROR.code;
    let message: string = OpenAPIErrors.COMMON.INTERNAL_SERVER_ERROR.message;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse() as any;

      if (typeof errorResponse === 'string') {
        message = errorResponse;
      } else if (errorResponse?.message) {
        message = Array.isArray(errorResponse.message)
          ? errorResponse.message[0]
          : errorResponse.message;
      }

      // Map common HTTP status codes to error codes
      switch (status) {
        case HttpStatus.BAD_REQUEST:
          errorCode = OpenAPIErrors.COMMON.INVALID_REQUEST.code;
          break;
        case HttpStatus.UNAUTHORIZED:
          errorCode = OpenAPIErrors.AUTH.INVALID_API_KEY.code;
          break;
        case HttpStatus.FORBIDDEN:
          errorCode = OpenAPIErrors.COMMON.FORBIDDEN.code;
          break;
        case HttpStatus.NOT_FOUND:
          errorCode = OpenAPIErrors.COMMON.NOT_FOUND.code;
          break;
        case HttpStatus.METHOD_NOT_ALLOWED:
          errorCode = OpenAPIErrors.COMMON.METHOD_NOT_ALLOWED.code;
          break;
        case HttpStatus.NOT_ACCEPTABLE:
          errorCode = OpenAPIErrors.COMMON.NOT_ACCEPTABLE.code;
          break;
        case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
          errorCode = OpenAPIErrors.COMMON.UNSUPPORTED_MEDIA_TYPE.code;
          break;
        case HttpStatus.TOO_MANY_REQUESTS:
          errorCode = OpenAPIErrors.COMMON.RATE_LIMIT_EXCEEDED.code;
          break;
        case HttpStatus.SERVICE_UNAVAILABLE:
          errorCode = OpenAPIErrors.COMMON.SERVICE_UNAVAILABLE.code;
          break;
      }
    }

    const errorResponse: OpenAPIErrorResponse = {
      error: {
        code: errorCode,
        message,
        doc_url: this.docUrl,
      },
    };

    response.status(status).json(errorResponse);
  }
}
