import { Field, ObjectType } from '@nestjs/graphql';

import { ApiTokenDTO } from './api-token.dto';

/**
 * Carries a plaintext token shown exactly once — returned by createApiToken (a
 * brand-new token) and rotateApiToken (a freshly-rotated secret).
 */
@ObjectType('CreatedApiToken')
export class CreatedApiTokenDTO {
  @Field(() => ApiTokenDTO)
  apiToken: ApiTokenDTO;

  /** The full plaintext token. Shown once and never retrievable again. */
  @Field()
  token: string;
}
