import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Environment extends BaseModel {
  @Field()
  name: string;

  @Field(() => String)
  token: string;

  @Field(() => String)
  projectId: string;

  // @Field(() => Boolean)
  // published: boolean;
}
