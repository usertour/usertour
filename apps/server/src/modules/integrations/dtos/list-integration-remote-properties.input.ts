import { ArgsType, Field } from '@nestjs/graphql';
import { IsIn, IsString } from 'class-validator';

@ArgsType()
export class ListIntegrationRemotePropertiesArgs {
  @Field(() => String)
  @IsString()
  integrationId: string;

  @Field(() => String)
  @IsIn(['contact', 'company'])
  remoteObject: string;
}
