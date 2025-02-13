import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

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
