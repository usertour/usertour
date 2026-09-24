import { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PageInfoDTO } from './page-info.dto';

/**
 * `itemName` is the item's GraphQL type name. It defaults to the class name,
 * which is right only while the two coincide — an item class carrying the DTO
 * suffix (ADR 0015) passes the name it pins, so the Edge type keeps its name.
 */
export function PaginatedResponse<TItem>(TItemClass: Type<TItem>, itemName?: string) {
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

    @Field(() => PageInfoDTO)
    pageInfo: PageInfoDTO;

    @Field(() => Int)
    totalCount: number;
  }
  return PaginatedType;
}
