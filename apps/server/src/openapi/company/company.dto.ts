import { ApiProperty } from '@nestjs/swagger';
import { Company } from '../models/company.model';

export class UpsertCompanyRequestDto {
  @ApiProperty({ description: 'Unique identifier for the company' })
  id: string;

  @ApiProperty({ description: 'Additional attributes for the company', type: 'object' })
  attributes?: Record<string, any>;
}

export class ListCompaniesResponseDto {
  @ApiProperty({ description: 'List of companies', type: [Company] })
  results: Company[];

  @ApiProperty({ description: 'URL for the next page', type: String, nullable: true })
  next: string | null;

  @ApiProperty({ description: 'URL for the previous page', type: String, nullable: true })
  previous: string | null;
}
