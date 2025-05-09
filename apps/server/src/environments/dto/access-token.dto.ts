import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@ObjectType()
export class AccessToken {
  @Field(() => ID)
  id: string;

  @Field()
  prefix: string;

  @Field()
  accessToken: string;

  @Field()
  name: string;

  @Field()
  isActive: boolean;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;

  @Field(() => Date, { nullable: true })
  lastUsedAt?: Date;

  @Field({ nullable: true })
  description?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@InputType()
export class CreateAccessTokenInput {
  @Field()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;
}
