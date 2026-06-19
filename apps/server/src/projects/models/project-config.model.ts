import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProjectConfigModel {
  @Field()
  removeBranding: boolean;

  @Field()
  customCss: boolean;

  @Field()
  ssoOidc: boolean;

  @Field()
  ssoSaml: boolean;

  @Field()
  planType: string;
}
