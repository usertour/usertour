import { Field, Int, ObjectType } from '@nestjs/graphql';

import { InstanceLicensePayloadDTO } from './instance-license-payload.dto';

@ObjectType('InstanceLicenseInfo')
export class InstanceLicenseInfoDTO {
  @Field(() => InstanceLicensePayloadDTO, { nullable: true })
  payload: InstanceLicensePayloadDTO | null;

  @Field()
  isValid: boolean;

  @Field(() => Boolean, { nullable: true })
  isExpired: boolean;

  @Field(() => String, { nullable: true })
  error: string | null;

  @Field(() => Int, { nullable: true })
  daysRemaining: number | null;
}
