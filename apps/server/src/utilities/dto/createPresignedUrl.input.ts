import { IsNotEmpty } from "class-validator";
import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class createPresignedUrlInput {
  @Field()
  @IsNotEmpty()
  fileName: string;

  @Field({ nullable: true })
  contentType?: string;

  @Field()
  @IsNotEmpty()
  storageType: string;
}
