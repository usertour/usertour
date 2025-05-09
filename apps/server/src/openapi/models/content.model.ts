import { ApiProperty } from '@nestjs/swagger';

export class Question {
  @ApiProperty({ example: 'question' })
  object: string;

  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  cvid: string;

  @ApiProperty({ example: 'NPS' })
  name: string;

  @ApiProperty({ example: 'nps' })
  type: string;
}

export class ContentVersion {
  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  id: string;

  @ApiProperty({ example: 'contentVersion' })
  object: string;

  @ApiProperty({ example: 1 })
  number: number;

  @ApiProperty({ type: [Question], nullable: true })
  questions?: Question[];

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  updatedAt: string;

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  createdAt: string;
}

export class Content {
  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  id: string;

  @ApiProperty({ example: 'content' })
  object: string;

  @ApiProperty({ example: 'My Content' })
  name: string;

  @ApiProperty({ example: 'flow' })
  type: string;

  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  editedVersionId: string;

  @ApiProperty({ nullable: true })
  editedVersion?: ContentVersion;

  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  publishedVersionId: string;

  @ApiProperty({ nullable: true })
  publishedVersion?: ContentVersion;

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  updatedAt: string;

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  createdAt: string;
}
