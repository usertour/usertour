import { ApiProperty } from '@nestjs/swagger';
import { ContentSession } from '../models/content-session.model';
import { IsString, IsOptional, IsEnum, IsNotEmpty, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ContentSessionExpandType {
  ANSWERS = 'answers',
  CONTENT = 'content',
  COMPANY = 'company',
  USER = 'user',
  VERSION = 'version',
}

export enum ContentSessionOrderByType {
  CREATED_AT = 'createdAt',
  CREATED_AT_DESC = '-createdAt',
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
  @IsNotEmpty()
  contentId: string;

  @ApiProperty({
    description: 'Filter by user ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Cursor for pagination',
    required: false,
  })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({
    description: 'Fields to expand in the response',
    enum: ContentSessionExpandType,
    isArray: true,
    required: false,
  })
  @IsEnum(ContentSessionExpandType, { each: true })
  @IsOptional()
  expand?: ContentSessionExpandType[];

  @ApiProperty({
    description: 'Sort order',
    required: false,
    enum: ContentSessionOrderByType,
    isArray: true,
  })
  @IsEnum(ContentSessionOrderByType, { each: true })
  @IsOptional()
  orderBy?: ContentSessionOrderByType[];
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
