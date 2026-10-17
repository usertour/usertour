import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import type { IntegrationRegion as IntegrationRegionValue } from '@usertour/types';

import { IntegrationRegion } from '../types/integration-region.type';
import { IntegrationTimelineEventsDTO } from './integration-timeline-events.dto';

registerEnumType(IntegrationRegion, { name: 'IntegrationRegion' });

/** Provider extras stored in `Integration.config`. */
@ObjectType('IntegrationConfig')
export class IntegrationConfigDTO {
  @Field(() => IntegrationRegion, { nullable: true })
  region?: IntegrationRegionValue | null;

  @Field(() => IntegrationTimelineEventsDTO, { nullable: true })
  events?: IntegrationTimelineEventsDTO | null;
}
