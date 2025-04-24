import { ApiProperty } from '@nestjs/swagger';
import { Company } from './company.model';
import { Membership } from './membership.model';

export class User {
  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  id: string;

  @ApiProperty({ example: 'user' })
  object: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  attributes: Record<string, any>;

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  createdAt: string;

  @ApiProperty({ nullable: true })
  companies: Company[];

  @ApiProperty({ nullable: true })
  memberships: Membership[];
}
