import {
  ExceptionFilter,
  HttpStatus,
  Catch,
  ArgumentsHost,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { genBaseRespDataFromError } from '@/common/exceptions/exception';
import { OAuthError, UnknownError } from '@/common/errors/errors';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Handle http exceptions
    if (exception instanceof HttpException) {
      this.logger.warn(
        `Request: ${request.method} ${request.url} http exception: (${exception.getStatus()}) ${
          exception.message
        }, ` + `stack: ${exception.stack}`,
      );

      const status = exception.getStatus();
      response?.status(status).json(exception.getResponse());
      return;
    }

    const baseRespData = genBaseRespDataFromError(exception);

    // Handle OAuth errors — land on the sign-in page with a failure marker.
    if (baseRespData.errCode === new OAuthError().code) {
      response?.redirect('/auth/signin?loginFailed=1');
      return;
    }

    if (baseRespData.errCode === new UnknownError().code) {
      this.logger.error(
        `Request: ${request.method} ${request.url} unknown err: ${exception.stack}`,
      );
    } else {
      // Handle other business exceptions
      this.logger.warn(
        `Request: ${request.method} ${request.url} biz err: ${baseRespData.errMsg}, ` +
          `stack: ${baseRespData.stack}`,
      );
    }

    response?.status(HttpStatus.OK).json(baseRespData);
  }
}
