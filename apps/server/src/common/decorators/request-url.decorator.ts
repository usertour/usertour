// apps/server/src/common/decorators/request-url.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Interface defining options for URL construction
 */
export interface RequestUrlOptions {
  /** Whether to include protocol (http/https) in the URL */
  includeProtocol?: boolean;
  /** Whether to include hostname in the URL */
  includeHostname?: boolean;
  /** Whether to include query parameters in the URL */
  includeQuery?: boolean;
}

/**
 * Decorator that constructs the request URL
 * @param options Configuration options for URL construction
 * @returns A decorator function that returns the constructed URL
 */
export const RequestUrl = createParamDecorator(
  (options: RequestUrlOptions, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const { includeProtocol = false, includeHostname = false, includeQuery = true } = options || {};

    let url = '';

    // Add protocol if requested
    if (includeProtocol) {
      url += `${request.protocol}://`;
    }

    // Add hostname if requested
    if (includeHostname) {
      url += request.hostname;
      // Add port if it's not the default port (80 for http, 443 for https)
      const port = request.socket?.localPort;
      if (port && port !== 80 && port !== 443) {
        url += `:${port}`;
      }
    }

    // Add path and query parameters if requested
    if (includeQuery) {
      url += request.originalUrl;
    } else {
      // If query parameters are not included, only use the path
      url += request.path;
    }

    return url;
  },
);
