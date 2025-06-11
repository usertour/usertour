import { ApiProperty } from '@nestjs/swagger';
import { Content } from '../models/content.model';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ContentExpandType {
  EDITED_VERSION = 'editedVersion',
  PUBLISHED_VERSION = 'publishedVersion',
}

export enum VersionExpandType {
  QUESTIONS = 'questions',
}

export enum ContentOrderByType {
  CREATED_AT = 'createdAt',
  CREATED_AT_DESC = '-createdAt',
}

export enum VersionOrderByType {
  CREATED_AT = 'createdAt',
  CREATED_AT_DESC = '-createdAt',
}

export class ListContentResponseDto {
  @ApiProperty({ description: 'List of content', type: [Content] })
  results: Content[];

  @ApiProperty({ description: 'URL for the next page', type: String, nullable: true })
  next: string | null;

  @ApiProperty({ description: 'URL for the previous page', type: String, nullable: true })
  previous: string | null;
}

export class GetContentQueryDto {
  @ApiProperty({
    description: 'Fields to expand in the response',
    enum: ContentExpandType,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsEnum(ContentExpandType, { each: true })
  expand?: ContentExpandType[];
}

export class ListContentQueryDto {
  @ApiProperty({
    description: 'Cursor for pagination',
    required: false,
  })
  @IsOptional()
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
    description: 'Fields to expand in the response',
    enum: ContentExpandType,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsEnum(ContentExpandType, { each: true })
  expand?: ContentExpandType[];

  @ApiProperty({
    description: 'Sort order',
    enum: ContentOrderByType,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsEnum(ContentOrderByType, { each: true })
  orderBy?: ContentOrderByType[];
}

export class GetContentVersionQueryDto {
  @ApiProperty({
    description: 'Fields to expand in the response',
    enum: VersionExpandType,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsEnum(VersionExpandType, { each: true })
  expand?: VersionExpandType[];
}

export class ListContentVersionsQueryDto {
  @ApiProperty({
    description: 'Content ID',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  contentId: string;

  @ApiProperty({
    description: 'Cursor for pagination',
    required: false,
  })
  @IsOptional()
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
    description: 'Fields to expand in the response',
    enum: VersionExpandType,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsEnum(VersionExpandType, { each: true })
  expand?: VersionExpandType[];

  @ApiProperty({
    description: 'Sort order',
    enum: VersionOrderByType,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsEnum(VersionOrderByType, { each: true })
  orderBy?: VersionOrderByType[];
}
