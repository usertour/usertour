import PaginatedResponse from '@/common/pagination/pagination';
import { ObjectType } from '@nestjs/graphql';
import { Content } from './content.model';

@ObjectType()
export class ContentConnection extends PaginatedResponse(Content) {}
