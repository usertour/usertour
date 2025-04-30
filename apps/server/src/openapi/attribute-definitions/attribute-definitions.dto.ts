import { ApiProperty } from '@nestjs/swagger';
import { Attribute } from '../models/attribute.model';
import { IsOptional, IsString, IsInt, Min, Max, IsEnum, Matches } from 'class-validator';
import { OpenApiObjectType } from '@/common/openapi/types';

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
    required: false,
    description: 'Filter by scope',
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
    required: false,
    description: 'Cursor for pagination',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    required: false,
    description: 'Field to order by. Prefix with - for descending order',
    type: [String],
    example: ['displayName', '-createdAt'],
  })
  @IsOptional()
  @IsString({ each: true })
  @Matches(/^-?(displayName|codeName|createdAt)$/, { each: true })
  orderBy?: string[];
}
