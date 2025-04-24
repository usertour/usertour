import { HttpException, HttpStatus } from '@nestjs/common';

export class OpenAPIException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST, code?: string) {
    const errorCode = code || OpenAPIException.getDefaultCode(status);
    super(
      {
        message,
        code: errorCode,
      },
      status,
    );
  }

  private static getDefaultCode(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'invalid_request';
      case HttpStatus.UNAUTHORIZED:
        return 'invalid_api_key';
      case HttpStatus.FORBIDDEN:
        return 'forbidden';
      case HttpStatus.NOT_FOUND:
        return 'not_found';
      case HttpStatus.METHOD_NOT_ALLOWED:
        return 'method_not_allowed';
      case HttpStatus.NOT_ACCEPTABLE:
        return 'not_acceptable';
      case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
        return 'unsupported_media_type';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'rate_limit_exceeded';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'service_unavailable';
      default:
        return 'internal_server_error';
    }
  }
}
