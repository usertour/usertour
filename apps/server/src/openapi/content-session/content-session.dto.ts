import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsArray, IsString, IsNumber } from 'class-validator';
import { ContentSession } from '../models/content-session.model';

export enum ExpandType {
  ANSWERS = 'answers',
  CONTENT = 'content',
  COMPANY = 'company',
  USER = 'user',
  VERSION = 'version',
}

export type ExpandTypes = ExpandType[];

export class GetContentSessionInput {
  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  @IsString()
  environmentId: string;

  @ApiProperty({
    enum: ExpandType,
    isArray: true,
    required: false,
    description: 'Relations to expand',
  })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  expand?: ExpandTypes;
}

export class ListContentSessionsInput {
  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  @IsString()
  environmentId: string;

  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz', required: false })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({
    enum: ExpandType,
    isArray: true,
    required: false,
    description: 'Relations to expand',
  })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  expand?: ExpandTypes;
}

export class DeleteContentSessionInput {
  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  @IsString()
  environmentId: string;
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
