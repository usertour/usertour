import { Field, InputType } from '@nestjs/graphql';

import type { UserChanges } from '../types/user-changes.type';

@InputType()
export class UpdateUserInput implements UserChanges {
  @Field()
  name: string;

  @Field({ nullable: true })
  avatarUrl?: string;
}
