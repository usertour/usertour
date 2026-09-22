import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('LicensePayload')
export class LicensePayloadDTO {
  @Field(() => String)
  plan: string;

  @Field(() => String)
  sub: string;

  @Field(() => String)
  projectId: string;

  @Field(() => Int)
  iat: number;

  @Field(() => Int)
  exp: number;

  @Field(() => String)
  issuer: string;

  @Field(() => [String])
  features: string[];
}
