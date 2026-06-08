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

export class ContentEnvironment {
  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  environmentId: string;

  @ApiProperty({ example: true })
  published: boolean;

  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz' })
  publishedVersionId: string;

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  publishedAt: string;

  @ApiProperty({ type: () => ContentVersion, nullable: true })
  publishedVersion?: ContentVersion;
}

/**
 * v1 (legacy) content shape. Frozen for backward compatibility: publish state is
 * a single `publishedVersionId`/`publishedVersion` read from the deprecated
 * `Content.publishedVersionId`. This cannot represent per-environment publishing
 * correctly — new integrations should use v2 (`ContentV2`), which exposes
 * `environments[]`.
 */
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

  @ApiProperty({ example: 'cm9cs634h00001mp50l45n7kz', nullable: true })
  publishedVersionId: string;

  @ApiProperty({ nullable: true })
  publishedVersion?: ContentVersion;

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  updatedAt: string;

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  createdAt: string;
}

/**
 * v2 content shape. Publishing is per-environment, so publish state is exposed as
 * `environments[]` (one entry per environment the content is published to)
 * instead of the deprecated single `publishedVersionId`.
 */
export class ContentV2 {
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

  @ApiProperty({ type: [ContentEnvironment] })
  environments: ContentEnvironment[];

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  updatedAt: string;

  @ApiProperty({ example: '2022-10-17T12:34:56.000+00:00' })
  createdAt: string;
}
