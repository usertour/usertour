import { BaseModel } from '@/common/models/base.model';
import { Environment } from '@/environments/models/environment.model';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Project extends BaseModel {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  logoUrl?: string;

  @Field(() => [Environment], { nullable: true })
  environments?: [Environment];

  @Field(() => String, { nullable: true })
  customerId?: string;

  @Field(() => String, { nullable: true })
  subscriptionId?: string;
}
