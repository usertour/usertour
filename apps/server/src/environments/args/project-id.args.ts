import { ArgsType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@ArgsType()
export class ProjectIdArgs {
  @IsNotEmpty()
  @Field()
  projectId: string;
}
