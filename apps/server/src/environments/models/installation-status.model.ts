import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * Whether an environment has received any SDK data yet — used by the
 * Installation page to confirm usertour.js is wired up. `installed` is true once
 * at least one BizUser exists for the environment (i.e. usertour.identify() has
 * run against it).
 */
@ObjectType()
export class InstallationStatus {
  @Field()
  installed: boolean;

  @Field(() => Int)
  userCount: number;
}
