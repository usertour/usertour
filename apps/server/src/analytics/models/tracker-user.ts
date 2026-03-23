import { BizModel, BizUser } from '@/biz/models/biz.model';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TrackerUser {
  @Field(() => String)
  id: string;

  @Field(() => BizUser)
  bizUser: BizUser;

  @Field(() => BizModel, { nullable: true })
  bizCompany?: BizModel;

  @Field(() => Date)
  firstTrackedAt: Date;

  @Field(() => Date)
  lastTrackedAt: Date;

  @Field(() => Int)
  eventsCount: number;
}
