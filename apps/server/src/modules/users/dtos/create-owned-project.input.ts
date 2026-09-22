import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MaxLength } from 'class-validator';

@InputType()
export class CreateOwnedProjectInput {
  @Field()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;
}
