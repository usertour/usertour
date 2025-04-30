import { ApiProperty } from '@nestjs/swagger';
import { Company } from './company.model';
import { User } from './user.model';
import { OpenApiObjectType } from '@/common/openapi/types';

export class CompanyMembership {
  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  id: string;

  @ApiProperty({ example: OpenApiObjectType.COMPANY_MEMBERSHIP })
  object: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  attributes: Record<string, any>;

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  createdAt: string;

  @ApiProperty({ type: () => Company, nullable: true })
  company: Company;

  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  companyId: string;

  @ApiProperty({ type: () => User, nullable: true })
  user: User;

  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  userId: string;
}
