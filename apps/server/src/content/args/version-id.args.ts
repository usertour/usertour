import { ArgsType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@ArgsType()
export class VersionIdArgs {
  @IsNotEmpty()
  @Field(() => String)
  versionId: string;
}
