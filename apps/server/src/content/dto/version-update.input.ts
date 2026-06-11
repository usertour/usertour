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

  // Optimistic-lock baseline for whole-version saves: the version's
  // updatedAt the client last loaded. When present, the save is rejected
  // with VersionConflictError if the row has been updated since.
  @Field(() => Date, { nullable: true })
  expectedUpdatedAt?: Date;
}
