import { Field, ObjectType } from '@nestjs/graphql';

import { AuthDTO } from './auth.dto';

@ObjectType('TwoFactorEnableResult')
export class TwoFactorEnableResultDTO {
  @Field(() => [String])
  recoveryCodes: string[];

  /** Populated when setup was completed via an `mfa-setup-required` challenge —
   * the same call also logs the user in so cookies are now set. */
  @Field(() => AuthDTO, { nullable: true })
  auth?: AuthDTO;
}
