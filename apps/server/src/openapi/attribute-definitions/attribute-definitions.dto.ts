import { ApiProperty } from '@nestjs/swagger';
import { Attribute } from '../models/attribute.model';
import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { OpenApiObjectType } from '@/common/types/openapi';

export class ListAttributesResponseDto {
  @ApiProperty({ description: 'List of attributes', type: [Attribute] })
  results: Attribute[];

  @ApiProperty({ description: 'URL for the next page', type: String, nullable: true })
  next: string | null;

  @ApiProperty({ description: 'URL for the previous page', type: String, nullable: true })
  previous: string | null;
}

export class ListAttributesDto {
  @ApiProperty({
    description: 'Cursor for pagination',
    required: false,
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    description: 'Number of items to return',
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({
    description: 'Scope of the attribute definitions',
    required: false,
    enum: [
      OpenApiObjectType.USER,
      OpenApiObjectType.COMPANY,
      OpenApiObjectType.COMPANY_MEMBERSHIP,
      OpenApiObjectType.EVENT_DEFINITION,
    ],
  })
  @IsOptional()
  @IsEnum([
    OpenApiObjectType.USER,
    OpenApiObjectType.COMPANY,
    OpenApiObjectType.COMPANY_MEMBERSHIP,
    OpenApiObjectType.EVENT_DEFINITION,
  ])
  scope?: OpenApiObjectType;
}
