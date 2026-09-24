import { Field, InputType } from '@nestjs/graphql';
import { IsString, MaxLength } from 'class-validator';

@InputType()
export class SyncInboundFieldInput {
  /** Provider property name. */
  @Field(() => String)
  @IsString()
  @MaxLength(200)
  remote: string;

  /** Usertour attribute code name (validated as a codeName in the service). */
  @Field(() => String)
  @IsString()
  @MaxLength(100)
  local: string;
}
