import { Field, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

/**
 * GraphQL projection of an Integration row. The API key is deliberately NOT a
 * field — it is never returned after a write (stricter than webhook secrets:
 * nobody needs a provider key echoed back). `keyTail` is the display stand-in.
 */
@ObjectType('Integration')
export class IntegrationDTO {
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

  /** CRM providers (ADR 0013): whether an OAuth grant is stored. */
  @Field(() => Boolean)
  connected: boolean;

  /** CRM providers: the connected provider account id (HubSpot hub id). */
  @Field(() => String, { nullable: true })
  remoteAccountId?: string | null;

  /** CRM providers: a display label for the connected account (HubSpot hub domain). */
  @Field(() => String, { nullable: true })
  remoteAccountLabel?: string | null;
}
