import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Storage {
  @Field(() => String)
  signedUrl: string;

  @Field(() => String)
  cdnUrl: string;
}
