import { Field, ObjectType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';

import { BaseDTO } from '@/modules/common/dtos/base.dto';

import { ContentOnEnvironmentDTO } from './content-on-environment.dto';
import { StepDTO } from './step.dto';
import { VersionDTO } from './version.dto';
import { ContentConfigScalar } from './content-config.scalar';
import { ContentTypeScalar } from './content-type.scalar';

@ObjectType('Content')
export class ContentDTO extends BaseDTO {
  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  buildUrl?: string;

  @Field(() => ContentTypeScalar)
  type: string;

  @Field(() => ContentConfigScalar, { nullable: true })
  config?: JsonValue;

  @Field(() => String)
  environmentId: string;

  @Field(() => String, { nullable: true })
  projectId?: string;

  @Field(() => String, { nullable: true })
  editedVersionId?: string;

  @Field(() => VersionDTO, { nullable: true })
  editedVersion?: VersionDTO;

  @Field(() => Date)
  publishedAt: Date;

  @Field(() => String, { nullable: true })
  publishedVersionId?: string;

  @Field(() => VersionDTO, { nullable: true })
  publishedVersion?: VersionDTO;

  @Field(() => Boolean)
  published: boolean;

  @Field(() => Boolean)
  deleted: boolean;

  @Field(() => [StepDTO], { nullable: true })
  steps?: [StepDTO];

  @Field(() => [ContentOnEnvironmentDTO], { nullable: true })
  contentOnEnvironments?: [ContentOnEnvironmentDTO];
}
