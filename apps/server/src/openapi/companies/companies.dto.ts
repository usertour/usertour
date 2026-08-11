import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  Matches,
  ValidateNested,
  Min,
  Max,
  IsInt,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Company } from '../models/company.model';

export enum CompanyExpandType {
  USERS = 'users',
  MEMBERSHIPS = 'memberships',
  MEMBERSHIPS_USER = 'memberships.user',
}

export enum CompanyOrderByType {
  CREATED_AT = 'createdAt',
  CREATED_AT_DESC = '-createdAt',
}

export class UpsertUserDto {
  @IsString()
  // A blank external id would create a user no id-keyed read/delete can ever
  // address again (their guards reject blank ids).
  @Matches(/\S/, { message: 'user id must be a non-empty string' })
  @ApiProperty({ example: '1745492995926' })
  id: string;

  @IsOptional()
  @ApiProperty({ example: { name: 'John Doe', email: 'john@example.com' } })
  attributes?: Record<string, any>;
}

export class UpsertMembershipDto {
  @ValidateNested()
  @Type(() => UpsertUserDto)
  @ApiProperty()
  user: UpsertUserDto;

  @ApiProperty({ required: false })
  attributes?: Record<string, any>;
}

export class UpsertCompanyRequestDto {
  @IsString()
  // Same rule as UpsertUserDto.id: blank ids create unaddressable rows.
  @Matches(/\S/, { message: 'id must be a non-empty string' })
  @ApiProperty({ example: '1745492995926' })
  id: string;

  @IsOptional()
  @ApiProperty({ example: { name: 'Acme Inc.' } })
  attributes?: Record<string, any>;
}

export class ListCompaniesQueryDto {
  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({
    description: 'Cursor for pagination',
    required: false,
  })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiProperty({
    description: 'Fields to expand',
    required: false,
    enum: CompanyExpandType,
    isArray: true,
  })
  @IsEnum(CompanyExpandType, { each: true })
  @IsOptional()
  expand?: CompanyExpandType[];

  @ApiProperty({
    description: 'Sort order',
    required: false,
    enum: CompanyOrderByType,
    isArray: true,
    example: ['createdAt'],
  })
  @IsEnum(CompanyOrderByType, { each: true })
  @IsOptional()
  orderBy?: CompanyOrderByType[];
}

export class ListCompaniesResponseDto {
  @ApiProperty({ description: 'List of companies', type: [Company] })
  results: Company[];

  @ApiProperty({ description: 'URL for the next page', type: String, nullable: true })
  next: string | null;

  @ApiProperty({ description: 'URL for the previous page', type: String, nullable: true })
  previous: string | null;
}

export class GetCompanyQueryDto {
  @ApiProperty({
    description: 'Fields to expand',
    required: false,
    enum: CompanyExpandType,
    isArray: true,
  })
  @IsEnum(CompanyExpandType, { each: true })
  @IsOptional()
  expand?: CompanyExpandType[];
}
