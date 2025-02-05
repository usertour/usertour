import { GraphqlConfig } from "./common/configs/config.interface";
import { ConfigService } from "@nestjs/config";
import { ApolloDriverConfig, UserInputError } from "@nestjs/apollo";
import { Injectable } from "@nestjs/common";
import { GqlOptionsFactory } from "@nestjs/graphql";
import { ValidationError } from "class-validator";
import { isValid, isArray } from "@/utils/helper";

@Injectable()
export class GqlConfigService implements GqlOptionsFactory {
  constructor(private configService: ConfigService) {}
  createGqlOptions(): ApolloDriverConfig {
    const graphqlConfig = this.configService.get<GraphqlConfig>("graphql");
    return {
      // schema options
      autoSchemaFile: graphqlConfig.schemaDestination || "./src/schema.graphql",
      sortSchema: graphqlConfig.sortSchema,
      buildSchemaOptions: {
        numberScalarMode: "integer",
      },
      // subscription
      installSubscriptionHandlers: true,
      includeStacktraceInErrorResponses: graphqlConfig.debug,
      playground: graphqlConfig.playgroundEnabled,
      formatError: (e) => {
        if (e instanceof ValidationError || e instanceof UserInputError) {
          return {
            code: e.extensions.code,
            message: e.message,
          };
        }

        //@ts-ignore
        const response = e.extensions.exception?.response;
        let code = e.extensions.code;
        let message = e.message as string;

        if (isValid(response)) {
          if (isValid(response.code)) {
            code = response.code;
          } else if (isValid(response.error)) {
            code = response.error.replace(/\s+/g, "_").toUpperCase();
          }

          if (isValid(response.message)) {
            message = isArray(response.message)
              ? response.message[0]
              : response.message;
          }
        }

        //@ts-ignore
        delete e.extensions.exception?.response;

        return {
          code,
          message: e.message,
          //@ts-ignore
          ...e.extensions.exception,
          ...{ message },
        };
      },
      context: ({ req, res }) => ({ req, res }),
    };
  }
}
