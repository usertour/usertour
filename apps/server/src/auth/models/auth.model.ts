import { User } from '@/users/models/user.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { Token } from './token.model';

@ObjectType()
export class Auth extends Token {
  @Field(() => String, { nullable: true })
  redirectUrl?: string;

  @Field(() => User)
  user: User;
}

export type AuthProvider = 'email' | 'google' | 'github';

@ObjectType()
export class AuthConfigItem {
  @Field(() => String)
  provider: AuthProvider;
}
