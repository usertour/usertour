import { BizModelDTO } from '@/modules/biz/dtos/biz.dto';
import { BizUserDTO } from '@/modules/biz/dtos/biz-user.dto';
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('TrackerUser')
export class TrackerUserDTO {
  @Field(() => String)
  id: string;

  @Field(() => BizUserDTO)
  bizUser: BizUserDTO;

  @Field(() => BizModelDTO, { nullable: true })
  bizCompany?: BizModelDTO;

  @Field(() => Date)
  firstTrackedAt: Date;

  @Field(() => Date)
  lastTrackedAt: Date;

  @Field(() => Int)
  eventsCount: number;

  @Field(() => Int)
  companiesCount: number;
}
