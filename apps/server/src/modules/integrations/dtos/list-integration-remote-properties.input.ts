import { ArgsType, Field } from '@nestjs/graphql';
import type { SyncRemoteObject as SyncRemoteObjectValue } from '@usertour/types';
import { IsString } from 'class-validator';

import { SyncRemoteObject } from '../types/sync-remote-object.type';

@ArgsType()
export class ListIntegrationRemotePropertiesArgs {
  @Field(() => String)
  @IsString()
  integrationId: string;

  @Field(() => SyncRemoteObject)
  remoteObject: SyncRemoteObjectValue;
}
