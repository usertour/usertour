import { ApiProperty } from '@nestjs/swagger';
import { ContentSession } from '../models/content-session.model';

export enum ExpandType {
  ANSWERS = 'answers',
  CONTENT = 'content',
  COMPANY = 'company',
  USER = 'user',
  VERSION = 'version',
}

export enum OrderByType {
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
