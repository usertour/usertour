import { BaseModel } from '@/common/models/base.model';
import { EnvironmentDTO } from '@/modules/environments/dtos/environment.dto';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Project extends BaseModel {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  logoUrl?: string;

  @Field(() => [EnvironmentDTO], { nullable: true })
  environments?: [EnvironmentDTO];

  @Field(() => String, { nullable: true })
  customerId?: string;

  @Field(() => String, { nullable: true })
  subscriptionId?: string;

  @Field(() => String, { nullable: true })
  license?: string;
}
