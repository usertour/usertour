import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import type {
  SyncInboundField,
  SyncLocalObject as SyncLocalObjectValue,
  SyncMatchStrategy as SyncMatchStrategyValue,
  SyncOutboundField,
  SyncRemoteObject as SyncRemoteObjectValue,
} from '@usertour/types';

import { SyncLocalObject } from '../types/sync-local-object.type';
import { SyncMatchStrategy } from '../types/sync-match-strategy.type';
import { SyncRemoteObject } from '../types/sync-remote-object.type';
import { SyncInboundFieldDTO } from './sync-inbound-field.dto';
import { SyncOutboundFieldDTO } from './sync-outbound-field.dto';

registerEnumType(SyncRemoteObject, { name: 'SyncRemoteObject' });
registerEnumType(SyncLocalObject, { name: 'SyncLocalObject' });
registerEnumType(SyncMatchStrategy, { name: 'SyncMatchStrategy' });

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

  @Field(() => SyncRemoteObject)
  remoteObject: SyncRemoteObjectValue;

  @Field(() => SyncLocalObject)
  localObject: SyncLocalObjectValue;

  @Field(() => SyncMatchStrategy)
  matchStrategy: SyncMatchStrategyValue;

  @Field(() => String, { nullable: true })
  matchRemoteField?: string | null;

  @Field(() => [SyncInboundFieldDTO])
  inboundFields: SyncInboundField[];

  @Field(() => [SyncOutboundFieldDTO])
  outboundFields: SyncOutboundField[];

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
