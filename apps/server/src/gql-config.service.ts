import { ApolloDriverConfig } from '@nestjs/apollo';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlOptionsFactory } from '@nestjs/graphql';
import { STATUS_CODES } from 'node:http';
import { GraphQLError } from 'graphql';
import { BaseError } from './common/errors';

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
        this.logger.error(error);
        // @ts-expect-error allow assign
        formattedError.extensions ??= {};
        // Debug log
        // Handle BaseError instances
        if (error instanceof GraphQLError && error.originalError instanceof BaseError) {
          return {
            message: error.originalError.getMessage('en'),
            extensions: {
              code: error.originalError.code,
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
      },
      context: ({ req, res }) => ({ req, res }),
    };
  }
}
