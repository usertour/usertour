import { gql } from '@apollo/client';

export const queryContentAnalytics = gql`
  query queryContentAnalytics(
    $environmentId: String!
    $contentId: String!
    $startDate: String!
    $endDate: String!
    $timezone: String!
  ) {
    queryContentAnalytics(
      environmentId: $environmentId
      contentId: $contentId
      startDate: $startDate
      endDate: $endDate
      timezone: $timezone
    ) {
      uniqueViews
      totalViews
      uniqueCompletions
      totalCompletions
      viewsByDay
      viewsByStep
      viewsByTask
    }
  }
`;

export const queryBizSession = gql`
  query queryBizSession(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $query: AnalyticsQuery!
    $orderBy: AnalyticsOrder!
  ) {
    queryBizSession(
      first: $first
      last: $last
      after: $after
      before: $before
      query: $query
      orderBy: $orderBy
    ) {
      totalCount
      edges {
        cursor
        node {
          id
          createdAt
          progress
          data
          bizUserId
          state
          contentId
          bizUser {
            externalId
            data
          }
          bizEvent {
            data
            createdAt
            eventId
            event {
              id
              codeName
            }
          }
          version {
            id
            sequence
            data
            steps {
              id
              name
              cvid
              type
              sequence
              data
            }
          }
        }
      }
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const queryContentQuestionAnalytics = gql`
  query queryContentQuestionAnalytics(
    $environmentId: String!
    $contentId: String!
    $startDate: String!
    $endDate: String!
    $timezone: String!
  ) {
    queryContentQuestionAnalytics(
      environmentId: $environmentId
      contentId: $contentId
      startDate: $startDate
      endDate: $endDate
      timezone: $timezone
    )
  }
`;

export const listSessionsDetail = gql`
  query listSessionsDetail(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $query: AnalyticsQuery!
    $orderBy: AnalyticsOrder!
  ) {
    listSessionsDetail(
      first: $first
      last: $last
      after: $after
      before: $before
      query: $query
      orderBy: $orderBy
    ) {
      totalCount
      edges {
        cursor
        node {
          id
          createdAt
          progress
          data
          bizUserId
          state
          contentId
          version {
            sequence
          }
          bizUser {
            externalId
            data
            bizUsersOnCompany {
              id
              data
              bizCompany {
                id
                externalId
                data
              }
            }
          }
          bizEvent {
            data
            createdAt
            eventId
            event {
              id
              codeName
            }
          }
        }
      }
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const querySessionsByExternalId = gql`
  query querySessionsByExternalId(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $query: SessionQuery!
    $orderBy: AnalyticsOrder!
  ) {
    querySessionsByExternalId(
      first: $first
      last: $last
      after: $after
      before: $before
      query: $query
      orderBy: $orderBy
    ) {
      totalCount
      edges {
        cursor
        node {
          id
          createdAt
          progress
          data
          bizUserId
          state
          contentId
          content {
            id
            name
            buildUrl
            environmentId
            editedVersionId
            publishedVersionId
            published
            deleted
            publishedAt
            createdAt
            updatedAt
            type
          }
          version {
            id
            sequence
            data
          }
          bizUser {
            id
            externalId
            environmentId
            data
            bizUsersOnCompany {
              id
              data
              bizCompany {
                id
                externalId
                data
              }
            }
          }
          bizEvent {
            id
            eventId
            createdAt
            data
            event {
              id
              codeName
              displayName
            }
          }
        }
      }
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;
