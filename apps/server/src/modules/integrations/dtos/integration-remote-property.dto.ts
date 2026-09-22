import { Field, ObjectType } from '@nestjs/graphql';

/** A provider property, as offered by the mapping editor's pickers. */
@ObjectType('IntegrationRemoteProperty')
export class IntegrationRemotePropertyDTO {
  @Field(() => String)
  name: string;

  @Field(() => String)
  label: string;

  /** Provider type: string | number | bool | date | datetime | enumeration */
  @Field(() => String)
  type: string;

  @Field(() => String)
  fieldType: string;

  @Field(() => String)
  groupName: string;

  /** System or computed: readable, never writable. */
  @Field(() => Boolean)
  readOnly: boolean;

  @Field(() => Boolean)
  hubspotDefined: boolean;
}
