import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AdminProjectMember')
export class AdminProjectMemberDTO {
  @Field()
  id: string;

  @Field(() => String, { nullable: true })
  userId: string | null;

  @Field(() => String, { nullable: true })
  name: string | null;

  @Field(() => String, { nullable: true })
  email: string | null;

  @Field()
  role: string;

  @Field()
  isOwner: boolean;
}
