import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Common {
  @Field()
  success: boolean;

  // Nullability is declared explicitly on every field whose TS type is
  // optional — inferred nullability flips with toolchain upgrades (the
  // TS 4.9 → 5.3 bump changed it), and the public contract must not drift
  // as a side effect.
  @Field(() => Int, { nullable: true })
  count?: number;
}
