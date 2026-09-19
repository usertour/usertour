import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

import type { NewEnvironment } from '../types/new-environment.type';

@InputType()
export class CreateEnvironmentInput implements NewEnvironment {
  @Field()
  @IsNotEmpty()
  name: string;

  @Field()
  @IsNotEmpty()
  projectId: string;
}
