import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('AdminUser')
export class AdminUserDTO {
  @Field()
  id: string;

  @Field(() => String, { nullable: true })
  name: string | null;

  @Field(() => String, { nullable: true })
  email: string | null;

  @Field()
  createdAt: Date;

  @Field()
  isSystemAdmin: boolean;

  @Field()
  disabled: boolean;

  @Field(() => Int)
  projectCount: number;
}
