import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class BizUserOrCompanyIdsInput {
  @Field(() => [String])
  @IsNotEmpty()
  ids: string[];

  @Field(() => String)
  @IsNotEmpty()
  environmentId: string;
}
