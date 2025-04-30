import { ApiProperty } from '@nestjs/swagger';
import { CompanyMembership } from './company-membership.model';
import { User } from './user.model';

export class Company {
  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  id: string;

  @ApiProperty({ example: 'company' })
  object: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  attributes: Record<string, any>;

  @ApiProperty({ type: () => [CompanyMembership], required: false })
  memberships?: CompanyMembership[];

  @ApiProperty({ type: () => [User], required: false })
  users?: User[];

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  createdAt: string;
}
