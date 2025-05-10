import { isValid } from '@/utils/helper';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Logger } from '@/utils/logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: Error, host: ArgumentsHost): void {
    const gqlCtx = GqlExecutionContext.create(host as any);
    const ctx = gqlCtx.getContext();

    // Graphql request exception
    if (isValid(ctx.res)) {
      if (!(exception instanceof HttpException)) {
        // Log the exception
        this.logger.error(exception, exception.stack);

        // Re-throw the exception
        throw new InternalServerErrorException(exception.message);
      }
    }

    // Http request exception
    else {
      const res = host.switchToHttp().getResponse();

      let httpException = exception as HttpException;

      if (!(exception instanceof HttpException)) {
        httpException = new InternalServerErrorException(exception.message);

        // Log the exception
        this.logger.error(exception, exception.stack);
      }

      res.status(httpException.getStatus()).json(httpException.getResponse());
    }
  }
}
