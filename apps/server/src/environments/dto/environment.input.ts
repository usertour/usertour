import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class CreateEnvironmentInput {
  @Field()
  @IsNotEmpty()
  name: string;

  @Field()
  @IsNotEmpty()
  projectId: string;
}

@InputType()
export class UpdateEnvironmentInput {
  @Field(() => String)
  @IsNotEmpty()
  id: string;

  @Field()
  @IsNotEmpty()
  name: string;

  @Field(() => Boolean, { nullable: true })
  isPrimary?: boolean;
}

@InputType()
export class DeleteEnvironmentInput {
  @Field(() => String)
  @IsNotEmpty()
  id: string;
}
