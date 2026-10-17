import { BaseDTO } from '@/modules/common/dtos/base.dto';
import { IsBoolean, IsString, ValidateIf } from 'class-validator';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Events')
export class EventsDTO extends BaseDTO {
  @Field(() => String)
  @IsString()
  displayName: string;

  @Field(() => String)
  @IsString()
  codeName: string;

  // Non-optional on purpose: the Prisma column defaults to '', so a stored
  // event always has a description. CreateEventInput overrides this field
  // back to optional — creation may omit it and take the default.
  @Field(() => String)
  @IsString()
  description: string;

  @Field(() => Boolean, { nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  deleted?: boolean;

  @Field(() => String)
  @IsString()
  projectId: string;

  @Field(() => Boolean)
  @IsBoolean()
  predefined: boolean;

  @Field(() => [String])
  attributeIds: string[];

  @Field(() => String, { nullable: true })
  eventId?: string;
}
