import { Field, ObjectType } from '@nestjs/graphql';

/** Sync providers: milestone events written to the provider's record timeline (ADR 0013 §8). */
@ObjectType('IntegrationTimelineEvents')
export class IntegrationTimelineEventsDTO {
  @Field(() => Boolean)
  enabled: boolean;

  /** Subset of SYNC_TIMELINE_EVENTS (codeNames). */
  @Field(() => [String])
  codeNames: string[];
}
