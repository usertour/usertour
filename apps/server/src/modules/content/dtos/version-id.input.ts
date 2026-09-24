import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class VersionIdInput {
  @Field({ nullable: true })
  versionId?: string;

  @Field(() => String, { nullable: true })
  environmentId?: string;
}
