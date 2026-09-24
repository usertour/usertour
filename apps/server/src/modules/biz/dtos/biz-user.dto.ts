import { Field, ObjectType } from '@nestjs/graphql';

import { BizModelDTO } from './biz.dto';
import { BizUserOnCompanyDTO } from './biz-user-on-company.dto';

@ObjectType('BizUser')
export class BizUserDTO extends BizModelDTO {
  @Field(() => [BizUserOnCompanyDTO], { nullable: true })
  bizUsersOnCompany?: BizUserOnCompanyDTO[];
}
