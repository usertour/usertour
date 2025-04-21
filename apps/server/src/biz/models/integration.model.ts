import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Integration {
  @Field(() => ID)
  id: string;

  @Field()
  displayName: string;

  @Field()
  codeName: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  configSchema?: Record<string, any>;

  @Field()
  projectId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field()
  enabled: boolean;
}
