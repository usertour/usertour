import { Field, InputType } from '@nestjs/graphql';
import { IsString, MaxLength } from 'class-validator';

@InputType()
export class SyncOutboundFieldInput {
  /** Usertour attribute code name; the provider property name is assigned server-side. */
  @Field(() => String)
  @IsString()
  @MaxLength(100)
  local: string;
}
