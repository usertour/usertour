import { ApiProperty } from '@nestjs/swagger';
import { Content } from '../models/content.model';

export enum ExpandType {
  VERSIONS = 'versions',
  EDITED_VERSION = 'edited_version',
  PUBLISHED_VERSION = 'published_version',
}

export enum VersionExpandType {
  QUESTIONS = 'questions',
}

export enum OrderByType {
  CREATED_AT = 'createdAt',
}

export class ListContentsResponseDto {
  @ApiProperty({ description: 'List of contents', type: [Content] })
  results: Content[];

  @ApiProperty({ description: 'URL for the next page', type: String, nullable: true })
  next: string | null;

  @ApiProperty({ description: 'URL for the previous page', type: String, nullable: true })
  previous: string | null;
}
