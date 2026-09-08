import { Field, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

/** One sync run of a CRM integration (ADR 0013 §7): a full round or a journal poll's changes. */
@ObjectType()
export class IntegrationSyncRun {
  @Field(() => String)
  id: string;

  /** 'full' | 'journal' */
  @Field(() => String)
  kind: string;

  /** 'running' | 'succeeded' | 'failed' */
  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  mappingId?: string | null;

  @Field(() => String, { nullable: true })
  remoteObject?: string | null;

  @Field(() => String, { nullable: true })
  localObject?: string | null;

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

  /** Journal runs: provider record ids touched (string[], capped). */
  @Field(() => GraphQLJSON, { nullable: true })
  remoteIds?: unknown;
}
