import { Field, Int, ObjectType } from '@nestjs/graphql';

import { LicensePayloadDTO } from './license-payload.dto';

@ObjectType('LicenseInfo')
export class LicenseInfoDTO {
  @Field(() => LicensePayloadDTO, { nullable: true })
  payload?: LicensePayloadDTO;

  @Field(() => Boolean, { nullable: true })
  isValid?: boolean;

  @Field(() => Boolean, { nullable: true })
  isExpired?: boolean;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => Int, { nullable: true })
  daysRemaining?: number;
}
