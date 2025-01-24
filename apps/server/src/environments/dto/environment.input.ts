import { IsNotEmpty } from "class-validator";
import { InputType, Field } from "@nestjs/graphql";

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
}

@InputType()
export class DeleteEnvironmentInput {
  @Field(() => String)
  @IsNotEmpty()
  id: string;
}
