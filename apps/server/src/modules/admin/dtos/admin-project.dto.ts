import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('AdminProject')
export class AdminProjectDTO {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  createdAt: Date;

  @Field(() => String, { nullable: true })
  ownerName: string | null;

  @Field(() => String, { nullable: true })
  ownerEmail: string | null;

  @Field(() => Int)
  memberCount: number;

  @Field()
  usesInstanceLicense: boolean;

  @Field()
  licenseSource: string;
}
