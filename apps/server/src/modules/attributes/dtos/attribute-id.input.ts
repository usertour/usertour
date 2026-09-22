import { ArgsType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@ArgsType()
export class AttributeIdArgs {
  @IsNotEmpty()
  @Field(() => String)
  attributeId: string;
}
