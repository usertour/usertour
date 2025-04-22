import { Field, InputType, PartialType, PickType } from '@nestjs/graphql';
import { Integration } from '../models/integration.model';

@InputType()
export class UpsertBizIntegrationInput extends PartialType(
  PickType(Integration, ['enabled']),
  InputType,
) {
  @Field()
  integrationId: string;
}
