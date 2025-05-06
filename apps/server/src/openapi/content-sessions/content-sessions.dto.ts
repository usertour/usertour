import { ApiProperty } from '@nestjs/swagger';
import { ContentSession } from '../models/content-session.model';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum ContentSessionExpandType {
  ANSWERS = 'answers',
  CONTENT = 'content',
  COMPANY = 'company',
  USER = 'user',
  VERSION = 'version',
}

export enum ContentSessionOrderByType {
  CREATED_AT = 'createdAt',
}

export class ContentSessionOutput {
  @ApiProperty({ type: ContentSession })
  data: ContentSession;
}

export class ContentSessionsOutput {
  @ApiProperty({ type: [ContentSession] })
  results: ContentSession[];

  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz', nullable: true })
  next: string | null;

  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz', nullable: true })
  previous: string | null;
}

export class ListContentSessionsQueryDto {
  @ApiProperty({
    description: 'Content ID',
    required: true,
  })
  @IsString()
  contentId: string;

  @ApiProperty({
    description: 'Filter by company ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiProperty({
    description: 'Filter by user ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;
}

export class GetContentSessionQueryDto {
  @ApiProperty({
    description: 'Fields to expand in the response',
    enum: ContentSessionExpandType,
    isArray: true,
    required: false,
  })
  @IsEnum(ContentSessionExpandType, { each: true })
  @IsOptional()
  expand?: ContentSessionExpandType[];
}

export class DeleteContentSessionQueryDto {
  @ApiProperty({
    description: 'Content session ID',
    required: true,
  })
  @IsString()
  id: string;
}
