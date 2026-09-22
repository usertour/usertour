import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Storage')
export class StorageDTO {
  @Field(() => String)
  signedUrl: string;

  @Field(() => String)
  cdnUrl: string;
}
