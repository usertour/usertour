import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

/** Mapping-keyed operations carry the integration id so scope resolves from it. */
@InputType()
export class IntegrationObjectMappingIdInput {
  @Field(() => String)
  @IsString()
  integrationId: string;

  @Field(() => String)
  @IsString()
  id: string;
}
