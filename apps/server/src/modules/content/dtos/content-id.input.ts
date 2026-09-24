import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';

@InputType()
export class ContentIdInput {
  @Field()
  @IsNotEmpty()
  contentId: string;

  @Field({ nullable: true })
  @IsOptional()
  environmentId?: string;
}
