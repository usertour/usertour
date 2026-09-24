import { Field, Int, ObjectType } from '@nestjs/graphql';

/** One synced provider cohort and the segment mirroring it (ADR 0012). */
@ObjectType('IntegrationSyncedSegment')
export class IntegrationSyncedSegmentDTO {
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
