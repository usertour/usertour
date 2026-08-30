import { Field, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import PaginatedResponse from '@/common/pagination/pagination';

/**
 * GraphQL projection of an Integration row. The API key is deliberately NOT a
 * field — it is never returned after a write (stricter than webhook secrets:
 * nobody needs a provider key echoed back). `keyTail` is the display stand-in.
 */
@ObjectType()
export class Integration {
  @Field(() => String)
  id: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => String)
  environmentId: string;

  @Field(() => String)
  provider: string;

  /** Last four characters of the configured key ('' until one is stored). */
  @Field(() => String)
  keyTail: string;

  /** Provider extras: { region?: 'US' | 'EU' }. */
  @Field(() => GraphQLJSON)
  config: unknown;

  @Field(() => Boolean)
  enabled: boolean;

  /** Circuit-breaker streak: consecutive failed delivery attempts (any success resets). */
  @Field(() => Int)
  consecutiveFailures: number;

  /** While in the future, delivery is paused for this destination (cooldown). */
  @Field(() => Date, { nullable: true })
  cooldownUntil?: Date | null;

  /** Set when the SYSTEM disabled the integration after sustained failure. */
  @Field(() => Date, { nullable: true })
  autoDisabledAt?: Date | null;

  /** Inbound cohort sync switch (ADR 0012) — independent of `enabled`. */
  @Field(() => Boolean)
  inboundEnabled: boolean;

  /** Inbound extras: { userIdProperty?: string }. */
  @Field(() => GraphQLJSON)
  inboundConfig: unknown;

  /** The receive URL (carries the token) — null until first inbound enable. */
  @Field(() => String, { nullable: true })
  inboundUrl?: string | null;
}

/** One synced provider cohort and the segment mirroring it (ADR 0012). */
@ObjectType()
export class IntegrationSyncedSegment {
  @Field(() => String)
  id: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => String)
  sourceCohortId: string;

  @Field(() => String)
  sourceCohortName: string;

  @Field(() => String)
  segmentId: string;

  @Field(() => String)
  segmentName: string;

  @Field(() => Date, { nullable: true })
  lastSyncedAt?: Date | null;

  @Field(() => Int)
  memberCount: number;

  /** Members whose wire object carried no extractable user id (skipped). */
  @Field(() => Int)
  unresolvedCount: number;
}

/** GraphQL projection of one delivery attempt (read side, message log). */
@ObjectType()
export class IntegrationDelivery {
  @Field(() => String)
  id: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Int)
  attempt: number;

  @Field(() => Boolean)
  success: boolean;

  @Field(() => Int, { nullable: true })
  responseStatus?: number | null;

  /** Response body excerpt (truncated server-side). */
  @Field(() => String, { nullable: true })
  responseBody?: string | null;

  @Field(() => String, { nullable: true })
  error?: string | null;

  @Field(() => Int, { nullable: true })
  durationMs?: number | null;
}

/**
 * GraphQL projection of an outbound message addressed to an integration, with
 * its attempts. `payload` is the canonical envelope (the provider wire format
 * is derived from it at delivery time).
 */
@ObjectType()
export class IntegrationMessage {
  @Field(() => String)
  id: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => String)
  topic: string;

  /** PENDING | DELIVERED | FAILED */
  @Field(() => String)
  status: string;

  @Field(() => GraphQLJSON)
  payload: unknown;

  @Field(() => [IntegrationDelivery])
  deliveries: IntegrationDelivery[];
}

@ObjectType()
export class IntegrationMessageConnection extends PaginatedResponse(IntegrationMessage) {}
