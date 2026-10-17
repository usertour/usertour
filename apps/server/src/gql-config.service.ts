import { ApolloDriverConfig } from '@nestjs/apollo';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlOptionsFactory } from '@nestjs/graphql';
import { STATUS_CODES } from 'node:http';
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { BaseError } from '@/modules/common/errors/base-error';
import { ValidationError } from '@/modules/common/errors/errors';
import { requestLocale } from '@/modules/common/utils/request-locale.util';

// The codes a client presents as an outcome: every catalogue code but E0000
// (UnknownError, the server's "something it did not expect") and E0003
// (ParamsError, thrown without a reason of its own, so only the error locates
// it), plus GRAPHQL_VALIDATION_FAILED (a stale dashboard build, which reloads
// itself). This line serves the log, which has to locate a failure; the
// dashboard's error link draws its own for reporting (E0003 is expected
// there, GRAPHQL_VALIDATION_FAILED is not).
const isRefusal = (code: unknown): boolean => {
  if (code === 'GRAPHQL_VALIDATION_FAILED') {
    return true;
  }
  return typeof code === 'string' && /^E\d{4}$/.test(code) && code !== 'E0000' && code !== 'E0003';
};

@Injectable()
export class GqlConfigService implements GqlOptionsFactory {
  private readonly logger = new Logger(GqlConfigService.name);
  constructor(private configService: ConfigService) {}
  createGqlOptions(): ApolloDriverConfig {
    const graphqlConfig = this.configService.get('graphql');
    return {
      // schema options
      autoSchemaFile: graphqlConfig.schemaDestination || './src/schema.graphql',
      sortSchema: graphqlConfig.sortSchema,
      buildSchemaOptions: {
        numberScalarMode: 'integer',
      },
      // subscription
      installSubscriptionHandlers: true,
      includeStacktraceInErrorResponses: graphqlConfig.debug,
      playground: graphqlConfig.playgroundEnabled,

      formatError: (formattedError, error) => {
        const isGraphQLError = error instanceof GraphQLError;
        const originalError = isGraphQLError ? error.originalError : null;
        const response = this.toResponse(formattedError, originalError);

        // The response's code picks the log line. A refusal the client
        // presents is logged once, as a warning with the code, the path and
        // the reason the response carries, without a stack; everything else
        // is logged in full, since only the error itself locates it.
        const code = response.extensions?.code;
        if (isRefusal(code)) {
          this.logger.warn({
            msg: 'GraphQL request refused',
            context: this.constructor.name,
            code,
            reason: response.extensions?.reason ?? response.message,
            path: isGraphQLError ? error.path : undefined,
          });
        } else {
          this.logger.error({
            err: error,
            msg: 'GraphQL error occurred',
            context: this.constructor.name,
            ...(isGraphQLError
              ? {
                  originalError: error.originalError,
                  path: error.path,
                  locations: error.locations,
                }
              : {}),
          });
        }

        return response;
      },
      context: ({ req, res }) => ({ req, res }),
    };
  }

  /** What the client receives for a failed operation. */
  private toResponse(
    formattedError: GraphQLFormattedError,
    originalError: Error | null | undefined,
  ): GraphQLFormattedError {
    if (originalError instanceof BaseError) {
      return {
        message: originalError.getMessage(requestLocale.get()),
        extensions: {
          code: originalError.code,
          // Machine-readable context the client acts on (optional).
          ...(originalError.details ?? {}),
        },
      };
    }

    // An HttpException (a BadRequestException from the ValidationPipe).
    if (originalError instanceof HttpException) {
      const httpException = originalError;
      const response = httpException.getResponse() as any;

      // Extract error message
      let message: string;
      if (Array.isArray(response?.message)) {
        // Handle validation errors (array of messages)
        message = response.message[0] || httpException.message;
      } else if (typeof response === 'string') {
        message = response;
      } else {
        message = response?.message || httpException.message || 'Bad Request';
      }

      // The user reads the catalogue's message in the request's language;
      // the pipe's own text (which field, which rule) is for the developer.
      const validationError = new ValidationError();
      return {
        message: validationError.getMessage(requestLocale.get()),
        extensions: {
          code: validationError.code,
          reason: message,
        },
      };
    }

    // A variable the schema rejects (a null for a non-nullable input field,
    // a value of the wrong type): the request's own input is wrong, so it
    // is a validation error like one the pipe raises. The engine's text,
    // which names the variable path, goes to the developer as the reason.
    if (formattedError.extensions?.code === 'BAD_USER_INPUT') {
      const validationError = new ValidationError();
      return {
        message: validationError.getMessage(requestLocale.get()),
        extensions: {
          code: validationError.code,
          reason: formattedError.message,
        },
      };
    }

    // A document the schema rejects (a variable declared as a type the
    // server no longer has, a selection that no longer exists). Every
    // dashboard build validates its documents against the schema it was
    // built from, so this is a stale build talking to a newer server; the
    // code lets the dashboard reload itself. The message stays masked.
    if (formattedError.extensions?.code === 'GRAPHQL_VALIDATION_FAILED') {
      return {
        message: STATUS_CODES[HttpStatus.BAD_REQUEST],
        extensions: {
          status: HttpStatus.BAD_REQUEST,
          code: 'GRAPHQL_VALIDATION_FAILED',
        },
      };
    }

    return {
      message: 'Internal Server Error',
      extensions: {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: STATUS_CODES[HttpStatus.INTERNAL_SERVER_ERROR],
      },
    };
  }
}
