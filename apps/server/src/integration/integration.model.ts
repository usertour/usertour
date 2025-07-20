import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
class SalesforcePicklistValue {
  @Field()
  label: string;

  @Field()
  value: string;
}

@ObjectType()
class SalesforceField {
  @Field()
  name: string;

  @Field()
  label: string;

  @Field()
  type: string;

  @Field()
  required: boolean;

  @Field()
  unique: boolean;

  @Field(() => [String], { nullable: true })
  referenceTo?: string[];

  @Field(() => [SalesforcePicklistValue], { nullable: true })
  picklistValues?: SalesforcePicklistValue[];
}

@ObjectType()
class SalesforceObject {
  @Field()
  name: string;

  @Field()
  label: string;

  @Field(() => [SalesforceField])
  fields: SalesforceField[];
}

@ObjectType()
export class SalesforceObjectFields {
  @Field(() => [SalesforceObject])
  standardObjects: SalesforceObject[];

  @Field(() => [SalesforceObject])
  customObjects: SalesforceObject[];
}

@ObjectType()
export class IntegrationOAuth extends BaseModel {
  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;

  @Field()
  expiresAt: Date;

  @Field()
  scope: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonValue;

  @Field()
  provider: string;

  @Field()
  providerAccountId: string;
}

@ObjectType()
export class Integration extends BaseModel {
  @Field()
  provider: string;

  @Field()
  key: string;

  @Field()
  accessToken: string;

  @Field(() => GraphQLJSON, { nullable: true })
  config: JsonValue;

  @Field()
  enabled: boolean;

  @Field()
  environmentId: string;

  @Field(() => IntegrationOAuth, { nullable: true })
  integrationOAuth?: IntegrationOAuth;
}

@ObjectType()
export class IntegrationObjectMapping extends BaseModel {
  @Field()
  sourceObjectType: string;

  @Field()
  destinationObjectType: string;

  @Field()
  enabled: boolean;

  @Field()
  isSyncing: boolean;

  @Field(() => Date, { nullable: true })
  lastSyncedAt?: Date;

  @Field(() => GraphQLJSON, { nullable: true })
  settings?: JsonValue;

  @Field()
  integrationId: string;

  @Field(() => Integration, { nullable: true })
  integration?: Integration;
}
