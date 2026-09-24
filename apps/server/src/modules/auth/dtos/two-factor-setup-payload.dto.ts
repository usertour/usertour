import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('TwoFactorSetupPayload')
export class TwoFactorSetupPayloadDTO {
  @Field()
  secret: string;

  @Field()
  otpauthUri: string;

  @Field()
  qrDataUri: string;
}
