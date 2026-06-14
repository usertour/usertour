import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProjectConfigModel {
  @Field()
  removeBranding: boolean;

  @Field()
  customCss: boolean;

  @Field()
  auditLogs: boolean;

  @Field()
  planType: string;
}
