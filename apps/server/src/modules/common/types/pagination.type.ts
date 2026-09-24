/** Relay-style cursor pagination — what the list services take; PaginationArgs implements it. */
export interface Pagination {
  skip?: number;
  after?: string;
  before?: string;
  first?: number;
  last?: number;
}
