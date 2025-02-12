import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Events extends BaseModel {
  @Field(() => String)
  displayName: string;

  @Field(() => String)
  codeName: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  deleted?: boolean;

  @Field(() => String)
  projectId: string;

  @Field(() => Boolean)
  predefined: boolean;

  @Field(() => [String])
  attributeIds: string[];

  @Field(() => String, { nullable: true })
  eventId?: string;
}
