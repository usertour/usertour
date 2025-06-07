import { Field, InputType, PartialType, PickType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { ContentInput } from './content.input';

@InputType()
export class UpdateContentInput extends PartialType(
  PickType(ContentInput, ['name', 'buildUrl', 'config']),
  InputType,
) {}

@InputType()
export class ContentUpdateInput {
  @Field()
  @IsNotEmpty()
  contentId: string;

  @Field(() => UpdateContentInput, { nullable: false })
  content: UpdateContentInput;
}

@InputType()
export class ContentDuplicateInput extends PartialType(
  PickType(ContentInput, ['name']),
  InputType,
) {
  @Field()
  @IsNotEmpty()
  contentId: string;

  @Field({ nullable: true })
  @IsOptional()
  targetEnvironmentId?: string;
}

@InputType()
export class ContentIdInput {
  @Field()
  @IsNotEmpty()
  contentId: string;

  @Field({ nullable: true })
  @IsOptional()
  environmentId?: string;
}
