import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class StartIntegrationOAuthInput {
  @Field(() => String)
  @IsString()
  environmentId: string;

  /** Validated against SYNC_INTEGRATION_PROVIDERS in the service. */
  @Field(() => String)
  @IsString()
  @MaxLength(50)
  provider: string;

  /**
   * Marketplace-initiated install only: the returnUrl the provider handed the
   * callback. Must be a provider address; the state is handed back on it.
   */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  returnUrl?: string;
}
