import { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PageInfo } from './page-info.model';

/**
 * `itemName` is the item's GraphQL type name. It defaults to the class name,
 * which is right only while the two coincide — an item class carrying the DTO
 * suffix (ADR 0015) passes the name it pins, so the Edge type keeps its name.
 */
export default function Paginated<TItem>(TItemClass: Type<TItem>, itemName?: string) {
  @ObjectType(`${itemName ?? TItemClass.name}Edge`)
  abstract class EdgeType {
    @Field(() => String)
    cursor: string;

    @Field(() => TItemClass)
    node: TItem;
  }

  // `isAbstract` decorator option is mandatory to prevent registering in schema
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType {
    @Field(() => [EdgeType], { nullable: true })
    edges: Array<EdgeType>;

    // @Field((type) => [TItemClass], { nullable: true })
    // nodes: Array<TItem>;

    @Field(() => PageInfo)
    pageInfo: PageInfo;

    @Field(() => Int)
    totalCount: number;
  }
  return PaginatedType;
}
