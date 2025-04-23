import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Integration extends BaseModel {
  @Field()
  displayName: string;

  @Field()
  codeName: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  configSchema?: Record<string, any>;

  @Field()
  projectId: string;

  @Field()
  enabled: boolean;
}
