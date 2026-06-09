import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum EventDefinitionOrderByType {
  CREATED_AT = 'createdAt',
  CREATED_AT_DESC = '-createdAt',
  CODE_NAME = 'codeName',
  CODE_NAME_DESC = '-codeName',
  DISPLAY_NAME = 'displayName',
  DISPLAY_NAME_DESC = '-displayName',
}

export class ListEventDefinitionsQueryDto {
  @ApiProperty({
    description: 'Cursor for pagination',
    required: false,
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({
    description: 'Sort order',
    enum: EventDefinitionOrderByType,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsEnum(EventDefinitionOrderByType, { each: true })
  orderBy?: EventDefinitionOrderByType[];
}
