import { ApiProperty } from '@nestjs/swagger';
import { Content, ContentVersion } from './content.model';
import { Company } from './company.model';
import { User } from './user.model';
import { OpenApiObjectType } from '@/common/openapi/types';

export class ContentSessionAnswers {
  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  id: string;

  @ApiProperty({ example: 'question' })
  object: string;

  @ApiProperty({ example: 'nps' })
  answerType: string;

  @ApiProperty({ example: 'I really like your app!' })
  answerValue: string;

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  createdAt: string;

  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  questionCvid: string;

  @ApiProperty({ example: 'Feedback' })
  questionName: string;
}

export class ContentSession {
  @ApiProperty({ example: '33af21fd-f025-43fc-a492-cf5179b38ee3' })
  id: string;

  @ApiProperty({ example: OpenApiObjectType.CONTENT_SESSION })
  object: string;

  @ApiProperty({ example: null, nullable: true })
  answers: ContentSessionAnswers[] | null;

  @ApiProperty({ example: '2022-10-17T12:35:56.000+00:00', nullable: true })
  completedAt: string | null;

  @ApiProperty({ example: true })
  completed: boolean;

  @ApiProperty({ example: '54bce034-1303-4200-a09a-780a2eee355d' })
  contentId: string;

  @ApiProperty({ type: Content, nullable: true })
  content?: Content;

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  createdAt: string;

  @ApiProperty({ example: null, nullable: true })
  companyId: string | null;

  @ApiProperty({ type: Company, nullable: true })
  company?: Company;

  @ApiProperty({ example: false })
  isPreview: boolean;

  @ApiProperty({ example: '2022-10-17T12:35:56.000+00:00' })
  lastActivityAt: string;

  @ApiProperty({ example: 1 })
  progress: number;

  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  userId: string;

  @ApiProperty({ type: User, nullable: true })
  user?: User;

  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  versionId: string;

  @ApiProperty({ type: ContentVersion, nullable: true })
  version?: ContentVersion;
}
