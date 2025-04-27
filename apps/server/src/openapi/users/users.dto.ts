import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ExpandType {
  COMPANIES = 'companies',
  MEMBERSHIPS = 'memberships',
  MEMBERSHIPS_COMPANY = 'memberships.company',
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
