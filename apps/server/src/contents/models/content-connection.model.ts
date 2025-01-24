import { ObjectType } from '@nestjs/graphql';
import PaginatedResponse from '@/common/pagination/pagination';
import { Content } from './content.model';

@ObjectType()
export class ContentConnection extends PaginatedResponse(Content) { }
