import { ApiProperty } from '@nestjs/swagger';
import { Company } from './company.model';
import { CompanyMembership } from './company-membership.model';

export class User {
  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  id: string;

  @ApiProperty({ example: 'user' })
  object: 'user';

  @ApiProperty({ example: { name: 'John Doe', email: 'john@example.com' } })
  attributes: Record<string, any>;

  @ApiProperty({ example: '2024-03-29T16:05:45.000Z' })
  createdAt: string;

  @ApiProperty({ type: () => [Company], required: false })
  companies?: Company[];

  @ApiProperty({ type: () => [CompanyMembership], required: false })
  memberships?: CompanyMembership[];
}
