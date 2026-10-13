import { ApolloDriverConfig } from '@nestjs/apollo';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlOptionsFactory } from '@nestjs/graphql';
import { STATUS_CODES } from 'node:http';
import { GraphQLError } from 'graphql';
import { BaseError } from '@/modules/common/errors/base-error';
import { ValidationError } from '@/modules/common/errors/errors';
import { requestLocale } from '@/modules/common/utils/request-locale.util';

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
        // Log the complete error with context
        this.logger.error({
          err: error,
          msg: 'GraphQL error occurred',
          context: this.constructor.name,
          ...(error instanceof GraphQLError
            ? {
                originalError: error.originalError,
                path: error.path,
                locations: error.locations,
              }
            : {}),
        });

        // @ts-expect-error allow assign
        formattedError.extensions ??= {};

        // Extract original error for easier handling
        const isGraphQLError = error instanceof GraphQLError;
        const originalError = isGraphQLError ? error.originalError : null;

        // Handle BaseError instances
        if (isGraphQLError && originalError instanceof BaseError) {
          return {
            message: originalError.getMessage(requestLocale.get()),
            extensions: {
              code: originalError.code,
              // Machine-readable context the client acts on (optional).
              ...(originalError.details ?? {}),
            },
          };
        }

        // Handle HttpException instances (e.g., BadRequestException from ValidationPipe)
        if (isGraphQLError && originalError instanceof HttpException) {
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

          // Create ValidationError to match BaseError format
          const validationError = new ValidationError(message);

          return {
            message: validationError.getMessage(requestLocale.get()),
            extensions: {
              code: validationError.code,
            },
          };
        }

        // A variable the schema rejects (a null for a non-nullable input field,
        // a value of the wrong type): the request's own input is wrong, so it
        // is a validation error like one the pipe raises, and the message
        // names the variable path the client has to fix.
        if (formattedError.extensions?.code === 'BAD_USER_INPUT') {
          const validationError = new ValidationError(formattedError.message);
          return {
            message: validationError.getMessage(requestLocale.get()),
            extensions: {
              code: validationError.code,
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

        // Log unknown errors (excluding BaseError and HttpException which are handled above)
        if (
          isGraphQLError &&
          !(originalError instanceof BaseError) &&
          !(originalError instanceof HttpException)
        ) {
          this.logger.error({
            err: originalError || error,
            msg: 'GraphQL unknown error occurred',
            context: this.constructor.name,
          });
        }

        return {
          message: 'Internal Server Error',
          extensions: {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            code: STATUS_CODES[HttpStatus.INTERNAL_SERVER_ERROR],
          },
        };
      },
      context: ({ req, res }) => ({ req, res }),
    };
  }
}
