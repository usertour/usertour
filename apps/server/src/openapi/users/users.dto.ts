import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ExpandType {
  COMPANIES = 'companies',
  MEMBERSHIPS = 'memberships',
  MEMBERSHIPS_COMPANY = 'memberships.company',
}

export enum UserOrderByType {
  CREATED_AT = 'createdAt',
  CREATED_AT_DESC = '-createdAt',
}

export type ExpandTypes = ExpandType[];

export class CompanyDto {
  @ApiProperty({ description: 'The unique identifier for the company' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'The attributes of the company', required: false })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}

export class MembershipDto {
  @ApiProperty({ description: 'The company associated with the membership' })
  @ValidateNested()
  @Type(() => CompanyDto)
  company: CompanyDto;

  @ApiProperty({ description: 'The attributes of the membership', required: false })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}

export class UpsertUserRequestDto {
  @ApiProperty({ description: 'The unique identifier for the user' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'The attributes of the user', required: false })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiProperty({
    description: 'The companies associated with the user',
    required: false,
    type: [CompanyDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyDto)
  companies?: CompanyDto[];

  @ApiProperty({
    description: 'The memberships of the user',
    required: false,
    type: [MembershipDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MembershipDto)
  memberships?: MembershipDto[];
}

export class ListUsersQueryDto {
  @ApiProperty({ required: false, default: 20, description: 'Number of items per page' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({ required: false, description: 'Cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    required: false,
    type: [String],
    description:
      'Order by fields. Can be single value (orderBy=createdAt or orderBy=-createdAt) or array (orderBy[]=-createdAt&orderBy[]=name)',
    example: ['-createdAt', 'name'],
  })
  @IsOptional()
  @IsEnum(UserOrderByType, { each: true })
  orderBy?: UserOrderByType[];

  @ApiProperty({
    required: false,
    enum: ExpandType,
    isArray: true,
    description:
      'Fields to expand. Can be single value (expand=memberships), comma-separated values (expand=memberships,companies) or array (expand[]=memberships&expand[]=companies)',
  })
  @IsOptional()
  @IsEnum(ExpandType, { each: true })
  expand?: ExpandType[];

  @ApiProperty({ required: false, description: 'Filter users by email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Filter users by company ID' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ required: false, description: 'Filter users by segment ID' })
  @IsOptional()
  @IsString()
  segmentId?: string;
}

export class GetUserQueryDto {
  @ApiProperty({
    required: false,
    enum: ExpandType,
    isArray: true,
    description:
      'Fields to expand. Can be single value (expand=memberships), comma-separated values (expand=memberships,companies) or array (expand[]=memberships&expand[]=companies)',
  })
  @IsOptional()
  @IsEnum(ExpandType, { each: true })
  expand?: ExpandType[];
}
