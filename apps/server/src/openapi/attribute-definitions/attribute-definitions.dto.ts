import { ApiProperty } from '@nestjs/swagger';
import { Attribute } from '../models/attribute.model';
import { IsString, IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { OpenApiObjectType } from '@/common/openapi/types';
import { Transform } from 'class-transformer';

export enum AttributeDefinitionOrderByType {
  CREATED_AT = 'createdAt',
  CREATED_AT_DESC = '-createdAt',
  CODE_NAME = 'codeName',
  CODE_NAME_DESC = '-codeName',
  DISPLAY_NAME = 'displayName',
  DISPLAY_NAME_DESC = '-displayName',
}

export class ListAttributesResponseDto {
  @ApiProperty({ description: 'List of attributes', type: [Attribute] })
  results: Attribute[];

  @ApiProperty({ description: 'URL for the next page', type: String, nullable: true })
  next: string | null;

  @ApiProperty({ description: 'URL for the previous page', type: String, nullable: true })
  previous: string | null;
}

export class ListAttributeDefinitionsQueryDto {
  @ApiProperty({ required: false, default: 20, description: 'Number of items per page' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiProperty({ required: false, description: 'Cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    required: false,
    enum: OpenApiObjectType,
    description: 'Filter by scope',
  })
  @IsOptional()
  @IsEnum(OpenApiObjectType)
  scope?: OpenApiObjectType;

  @ApiProperty({
    required: false,
    type: [String],
    description:
      'Order by fields. Can be single value (orderBy=createdAt or orderBy=-createdAt) or array (orderBy[]=-createdAt&orderBy[]=name)',
    example: ['-createdAt', 'name'],
  })
  @IsOptional()
  @IsEnum(AttributeDefinitionOrderByType, { each: true })
  orderBy?: AttributeDefinitionOrderByType[];

  @ApiProperty({
    required: false,
    type: [String],
    description:
      'Filter by event names. Can be single value (eventName=page_viewed) or array (eventName[]=page_viewed&eventName[]=clicked)',
    example: ['page_viewed', 'clicked'],
  })
  @IsOptional()
  @Type(() => String)
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  eventName?: string[];
}
