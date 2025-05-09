import { ArgsType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@ArgsType()
export class ContentIdArgs {
  @IsNotEmpty()
  @Field(() => String)
  contentId: string;
}
