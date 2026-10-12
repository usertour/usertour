import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import type {
  SyncLocalObject as SyncLocalObjectValue,
  SyncRemoteObject as SyncRemoteObjectValue,
} from '@usertour/types';

import { IntegrationSyncRunKind } from '../types/integration-sync-run-kind.type';
import { IntegrationSyncRunStatus } from '../types/integration-sync-run-status.type';
import { SyncLocalObject } from '../types/sync-local-object.type';
import { SyncRemoteObject } from '../types/sync-remote-object.type';

registerEnumType(IntegrationSyncRunKind, { name: 'IntegrationSyncRunKind' });
registerEnumType(IntegrationSyncRunStatus, { name: 'IntegrationSyncRunStatus' });

/** One sync run of a CRM integration (ADR 0013 §7): a full round or a journal poll's changes. */
@ObjectType('IntegrationSyncRun')
export class IntegrationSyncRunDTO {
  @Field(() => String)
  id: string;

  @Field(() => IntegrationSyncRunKind)
  kind: IntegrationSyncRunKind;

  @Field(() => IntegrationSyncRunStatus)
  status: IntegrationSyncRunStatus;

  @Field(() => String, { nullable: true })
  mappingId?: string | null;

  @Field(() => SyncRemoteObject, { nullable: true })
  remoteObject?: SyncRemoteObjectValue | null;

  @Field(() => SyncLocalObject, { nullable: true })
  localObject?: SyncLocalObjectValue | null;

  @Field(() => Date)
  startedAt: Date;

  @Field(() => Date, { nullable: true })
  finishedAt?: Date | null;

  @Field(() => Int)
  records: number;

  @Field(() => Int)
  matchedCount: number;

  @Field(() => Int)
  unresolvedCount: number;

  @Field(() => String, { nullable: true })
  error?: string | null;

  /** Journal runs: the provider record ids touched, capped server-side. */
  @Field(() => [String], { nullable: true })
  remoteIds?: string[] | null;
}
