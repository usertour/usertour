import { ApiProperty } from '@nestjs/swagger';
import { User } from '../models/user.model';
import { Company } from '../models/company.model';
import { IsEnum, IsOptional } from 'class-validator';

export enum ExpandType {
  COMPANIES = 'companies',
  MEMBERSHIPS = 'memberships',
  MEMBERSHIPS_COMPANY = 'memberships.company',
}

export type ExpandTypes = ExpandType[];

export class UserExpandQueryDto {
  @ApiProperty({
    description: 'Expand related resources',
    enum: ExpandType,
    required: false,
  })
  @IsEnum(ExpandType)
  @IsOptional()
  expand?: ExpandType;
}

export class UpsertMembershipDto {
  @ApiProperty({ description: 'Unique identifier for the membership' })
  id: string;

  @ApiProperty({ description: 'Additional attributes for the membership', type: 'object' })
  attributes?: Record<string, any>;

  @ApiProperty({ description: 'Company information' })
  company: Pick<Company, 'id' | 'attributes'>;
}

export class UpsertUserRequestDto {
  @ApiProperty({ description: 'Unique identifier for the user' })
  id: string;

  @ApiProperty({ description: 'Additional attributes for the user', type: 'object' })
  attributes?: Record<string, any>;

  @ApiProperty({ description: 'List of companies/companies', type: [Company], required: false })
  companies?: Pick<Company, 'id' | 'attributes'>[];

  @ApiProperty({ description: 'List of memberships', type: [UpsertMembershipDto], required: false })
  memberships?: UpsertMembershipDto[];

  @ApiProperty({
    description: 'Whether to prune existing memberships',
    required: false,
    default: false,
  })
  prune_memberships?: boolean;
}

export class ListUsersResponseDto {
  @ApiProperty({ description: 'List of users', type: [User] })
  results: User[];

  @ApiProperty({ description: 'URL for the next page', type: String, nullable: true })
  next: string | null;

  @ApiProperty({ description: 'URL for the previous page', type: String, nullable: true })
  previous: string | null;
}
