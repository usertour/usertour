import { ArgsType, Field } from '@nestjs/graphql';
import { IsIn, IsNotEmpty } from 'class-validator';

@ArgsType()
export class ListDefinitionReferencesArgs {
  @IsNotEmpty()
  @Field()
  projectId: string;

  /** attribute, event, segment or theme. */
  @IsIn(['attribute', 'event', 'segment', 'theme'])
  @Field(() => String)
  kind: 'attribute' | 'event' | 'segment' | 'theme';

  @IsNotEmpty()
  @Field()
  id: string;
}
