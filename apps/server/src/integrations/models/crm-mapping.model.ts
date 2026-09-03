import { Field, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

/** GraphQL projection of an IntegrationObjectMapping row (ADR 0013 §4). */
@ObjectType()
export class IntegrationObjectMapping {
  @Field(() => String)
  id: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => String)
  integrationId: string;

  /** 'contact' | 'company' */
  @Field(() => String)
  remoteObject: string;

  /** 'user' | 'company' */
  @Field(() => String)
  localObject: string;

  /** 'email' | 'remoteField' */
  @Field(() => String)
  matchStrategy: string;

  @Field(() => String, { nullable: true })
  matchRemoteField?: string | null;

  /** [{ remote, local }] */
  @Field(() => GraphQLJSON)
  inboundFields: unknown;

  /** [{ local, remote }] */
  @Field(() => GraphQLJSON)
  outboundFields: unknown;

  @Field(() => Boolean)
  enabled: boolean;

  @Field(() => Date, { nullable: true })
  lastFullSyncAt?: Date | null;

  /** Set while a full-sync round is in progress. */
  @Field(() => Date, { nullable: true })
  fullSyncStartedAt?: Date | null;

  @Field(() => Int)
  matchedCount: number;

  @Field(() => Int)
  unresolvedCount: number;
}

/** A provider property, as offered by the mapping editor's pickers. */
@ObjectType()
export class CrmRemoteProperty {
  @Field(() => String)
  name: string;

  @Field(() => String)
  label: string;

  /** Provider type: string | number | bool | date | datetime | enumeration */
  @Field(() => String)
  type: string;

  @Field(() => String)
  fieldType: string;

  @Field(() => String)
  groupName: string;

  /** System or computed: readable, never writable. */
  @Field(() => Boolean)
  readOnly: boolean;

  @Field(() => Boolean)
  hubspotDefined: boolean;
}
