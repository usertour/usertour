import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Company } from '../models/company.model';

export enum ExpandType {
  USERS = 'users',
  MEMBERSHIPS = 'memberships',
  MEMBERSHIPS_USER = 'memberships.user',
}

export enum OrderByType {
  CREATED_AT = 'createdAt',
  // NAME = 'name',
}

export type ExpandTypes = ExpandType[];

export class UpsertUserDto {
  @IsString()
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
  @ApiProperty({ example: '1745492995926' })
  id: string;

  @IsOptional()
  @ApiProperty({ example: { name: 'Acme Inc.' } })
  attributes?: Record<string, any>;
}

export class ListCompaniesQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({ required: false, enum: ExpandType, isArray: true })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  expand?: ExpandTypes;
}

export class ListCompaniesResponseDto {
  @ApiProperty({ description: 'List of companies', type: [Company] })
  results: Company[];

  @ApiProperty({ description: 'URL for the next page', type: String, nullable: true })
  next: string | null;

  @ApiProperty({ description: 'URL for the previous page', type: String, nullable: true })
  previous: string | null;
}
