import { ApolloDriverConfig } from '@nestjs/apollo';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlOptionsFactory } from '@nestjs/graphql';
import { STATUS_CODES } from 'node:http';
import { GraphQLError } from 'graphql';
import { BaseError, ValidationError } from './common/errors';

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
            message: originalError.getMessage('en'),
            extensions: {
              code: originalError.code,
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
            message: validationError.getMessage('en'),
            extensions: {
              code: validationError.code,
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
