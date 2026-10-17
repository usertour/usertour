import { Field, ObjectType } from '@nestjs/graphql';

/** A Usertour-owned write-back: local attribute code name → remote property. */
@ObjectType('SyncOutboundField')
export class SyncOutboundFieldDTO {
  @Field(() => String)
  local: string;

  @Field(() => String)
  remote: string;
}
