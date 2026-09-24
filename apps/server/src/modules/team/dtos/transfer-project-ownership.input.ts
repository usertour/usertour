import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class TransferProjectOwnershipInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  projectId: string;

  /** The member who becomes OWNER; the current OWNER is demoted to ADMIN. */
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  userId: string;
}
