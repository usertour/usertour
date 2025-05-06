import { ApiProperty } from '@nestjs/swagger';
import { Content } from '../models/content.model';
import { IsEnum, IsOptional } from 'class-validator';

export enum ContentExpandType {
  EDITED_VERSION = 'edited_version',
  PUBLISHED_VERSION = 'published_version',
}

export enum VersionExpandType {
  QUESTIONS = 'questions',
}

export enum ContentOrderByType {
  CREATED_AT = 'createdAt',
  CREATED_AT_DESC = '-createdAt',
}

export class ListContentsResponseDto {
  @ApiProperty({ description: 'List of contents', type: [Content] })
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
