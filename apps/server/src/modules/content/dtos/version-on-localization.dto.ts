import { BaseDTO } from '@/modules/common/dtos/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';

import { VersionDTO } from './version.dto';
import { LocalizedContentScalar } from './localized-content.scalar';

@ObjectType('VersionOnLocalization')
export class VersionOnLocalizationDTO extends BaseDTO {
  @Field(() => LocalizedContentScalar)
  localized: JsonValue;

  @Field(() => LocalizedContentScalar)
  backup: JsonValue;

  @Field(() => String)
  versionId: string;

  @Field(() => Boolean)
  enabled: boolean;

  @Field(() => String)
  localizationId: string;

  /**
   * The owning version, populated by updateVersionLocalization: a
   * translation save touches the version's updatedAt, and returning the
   * version lets the client's normalized cache move "Autosaved" without a
   * refetch. List reads leave it null.
   */
  @Field(() => VersionDTO, { nullable: true })
  version?: VersionDTO;
}
