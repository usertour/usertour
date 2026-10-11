import { Field, ObjectType } from '@nestjs/graphql';

/** A provider-owned attribute: remote property → local attribute code name. */
@ObjectType('SyncInboundField')
export class SyncInboundFieldDTO {
  @Field(() => String)
  remote: string;

  @Field(() => String)
  local: string;
}
