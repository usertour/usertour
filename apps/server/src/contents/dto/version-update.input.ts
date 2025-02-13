import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { VersionInput } from './version.input';

@InputType()
export class VersionUpdateInput {
  @Field({ nullable: true })
  @IsNotEmpty()
  versionId: string;

  @Field(() => VersionInput)
  content: VersionInput;
}
