import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsInt, IsArray, Min, Max, IsOptional } from 'class-validator';

@InputType()
export class GenerateLicenseInput {
  @Field(() => String)
  @IsString()
  projectId: string;

  @Field(() => String)
  @IsString()
  plan: string;

  @Field(() => String)
  @IsString()
  subject: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(3650) // Max 10 years
  expiresInDays: number;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  issuer?: string;
}
