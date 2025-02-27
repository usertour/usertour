import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Invite extends BaseModel {
  @Field()
  email: string;

  @Field()
  code: string;

  @Field()
  expired: boolean;

  @Field()
  name: string;

  @Field()
  role: string;

  @Field()
  userId: string;

  @Field()
  projectId: string;
}
