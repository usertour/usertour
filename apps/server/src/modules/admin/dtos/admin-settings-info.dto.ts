import { Field, Int, ObjectType } from '@nestjs/graphql';

import { InstanceLicenseInfoDTO } from './instance-license-info.dto';

@ObjectType('AdminSettingsInfo')
export class AdminSettingsInfoDTO {
  @Field()
  instanceId: string;

  @Field(() => InstanceLicenseInfoDTO, { nullable: true })
  licenseInfo: InstanceLicenseInfoDTO | null;

  @Field(() => Int)
  projectCount: number;

  @Field(() => Int)
  projectsUsingInstanceLicense: number;

  @Field(() => Boolean)
  isOverProjectLimit: boolean;
}
