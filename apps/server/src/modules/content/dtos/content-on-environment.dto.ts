import { Field, ObjectType } from '@nestjs/graphql';

import { BaseModel } from '@/common/models/base.model';
import { EnvironmentDTO } from '@/modules/environments/dtos/environment.dto';

import { VersionDTO } from './version.dto';

@ObjectType('ContentOnEnvironment')
export class ContentOnEnvironmentDTO extends BaseModel {
  @Field(() => EnvironmentDTO)
  environment: EnvironmentDTO;

  @Field(() => String)
  environmentId: string;

  @Field(() => String)
  contentId: string;

  @Field(() => Boolean)
  published: boolean;

  @Field(() => Date)
  publishedAt: Date;

  @Field(() => String)
  publishedVersionId: string;

  @Field(() => VersionDTO)
  publishedVersion: VersionDTO;
}
