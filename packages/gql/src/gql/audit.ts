import { gql } from '@apollo/client';

export const ListAuditLogs = gql`
  query ListAuditLogs(
    $projectId: String!
    $first: Int
    $after: String
    $query: AuditLogQuery
    $orderBy: AuditLogOrder
  ) {
    auditLogs(
      projectId: $projectId
      first: $first
      after: $after
      query: $query
      orderBy: $orderBy
    ) {
      totalCount
      edges {
        cursor
        node {
          id
          createdAt
          source
          actorUserId
          actorTokenId
          action
          operation
          resourceType
          resourceId
          environmentId
          before
          after
          metadata
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;
