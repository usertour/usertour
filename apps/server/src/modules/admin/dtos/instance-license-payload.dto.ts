import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('InstanceLicensePayload')
export class InstanceLicensePayloadDTO {
  @Field(() => String, { nullable: true })
  plan: string;

  @Field(() => String, { nullable: true })
  sub: string;

  @Field(() => String, { nullable: true })
  scope: string;

  @Field(() => String, { nullable: true })
  instanceId: string;

  @Field(() => String, { nullable: true })
  projectId: string;

  @Field(() => Int, { nullable: true })
  projectLimit: number | null;

  @Field(() => Int, { nullable: true })
  iat: number;

  @Field(() => Int, { nullable: true })
  exp: number;

  @Field(() => String, { nullable: true })
  issuer: string;

  @Field(() => [String], { nullable: true })
  features: string[];
}
