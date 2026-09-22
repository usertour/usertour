import { Field, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

/** GraphQL projection of an IntegrationObjectMapping row (ADR 0013 §4). */
@ObjectType('IntegrationObjectMapping')
export class IntegrationObjectMappingDTO {
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
