import { Field, ObjectType } from '@nestjs/graphql';
import { Auth } from './auth.model';

@ObjectType()
export class TwoFactorSetupPayload {
  @Field()
  secret: string;

  @Field()
  otpauthUri: string;

  @Field()
  qrDataUri: string;
}

@ObjectType()
export class TwoFactorEnableResult {
  @Field(() => [String])
  recoveryCodes: string[];

  /** Populated when setup was completed via an `mfa-setup-required` challenge —
   * the same call also logs the user in so cookies are now set. */
  @Field(() => Auth, { nullable: true })
  auth?: Auth;
}
