import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

import type { EnvironmentChanges } from '../types/environment-changes.type';

@InputType()
export class UpdateEnvironmentInput implements EnvironmentChanges {
  @Field(() => String)
  @IsNotEmpty()
  id: string;

  @Field()
  @IsNotEmpty()
  name: string;

  @Field(() => Boolean, { nullable: true })
  isPrimary?: boolean;
}
