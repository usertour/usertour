import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('InstanceSetting')
export class InstanceSettingDTO {
  @Field()
  id: string;

  @Field()
  instanceId: string;

  @Field(() => String, { nullable: true })
  name: string | null;

  @Field(() => String, { nullable: true })
  contactEmail: string | null;

  @Field()
  allowUserRegistration: boolean;

  @Field()
  require2FA: boolean;

  @Field(() => Boolean, { nullable: true })
  allowProjectLevelSubscriptionManagement: boolean | null;

  @Field(() => String, { nullable: true })
  license: string | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
