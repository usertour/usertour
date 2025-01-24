import {
  InputType,
  OmitType,
  PickType,
  ArgsType,
  Field,
} from "@nestjs/graphql";
import {
  BizCompanyOnSegmentModel,
  BizUserOnSegmentModel,
  Segment,
} from "../models/segment.model";
import { IsNotEmpty } from "class-validator";

@InputType()
export class CreatSegment extends OmitType(
  Segment,
  ["id", "createdAt", "updatedAt"],
  InputType
) {}

@ArgsType()
export class ListSegment extends PickType(
  Segment,
  ["environmentId"],
  ArgsType
) {}

@InputType()
export class UpdateSegment extends PickType(
  Segment,
  ["name", "data", "id", "columns"],
  InputType
) {}

@InputType()
export class DeleteSegment extends PickType(Segment, ["id"], InputType) {}

@InputType()
export class BizUserOnSegmentInput extends PickType(
  BizUserOnSegmentModel,
  ["segmentId", "bizUserId", "data"],
  InputType
) {}

@InputType()
export class CreateBizUserOnSegment {
  @Field(() => [BizUserOnSegmentInput])
  @IsNotEmpty()
  userOnSegment: BizUserOnSegmentInput[];
}

@InputType()
export class BizCompanyOnSegmentInput extends PickType(
  BizCompanyOnSegmentModel,
  ["segmentId", "bizCompanyId", "data"],
  InputType
) {}

@InputType()
export class CreateBizCompanyOnSegment {
  @Field(() => [BizCompanyOnSegmentInput])
  @IsNotEmpty()
  companyOnSegment: BizCompanyOnSegmentInput[];
}

@InputType()
export class BizUserOrCompanyIdsInput {
  @Field(() => [String])
  @IsNotEmpty()
  ids: string[];

  @Field(() => String)
  @IsNotEmpty()
  environmentId: string;
}

@InputType()
export class DeleteBizUserOnSegment {
  @Field(() => [String])
  @IsNotEmpty()
  bizUserIds: string[];

  @Field(() => String)
  segmentId: string;
}

@InputType()
export class DeleteBizCompanyOnSegment {
  @Field(() => [String])
  @IsNotEmpty()
  bizCompanyIds: string[];

  @Field(() => String)
  segmentId: string;
}
