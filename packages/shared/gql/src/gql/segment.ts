import { gql } from '@apollo/client';

export const createSegment = gql`
  mutation createSegment($data: CreatSegment!) {
    createSegment(data: $data) {
      id
    }
  }
`;

export const updateSegment = gql`
  mutation updateSegment($data: UpdateSegment!) {
    updateSegment(data: $data) {
      id
    }
  }
`;

export const listSegment = gql`
  query listSegment($environmentId: String!) {
    listSegment(environmentId: $environmentId) {
      id
      bizType
      name
      environmentId
      dataType
      data
      columns
      createdAt
    }
  }
`;

export const deleteSegment = gql`
  mutation deleteSegment($id: ID!) {
    deleteSegment(data: { id: $id }) {
      success
    }
  }
`;

export const queryBizUser = gql`
  query queryBizUser(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $query: BizQuery!
    $orderBy: BizOrder!
  ) {
    queryBizUser(
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
          externalId
          environmentId
          data
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

export const queryBizCompany = gql`
  query queryBizCompany(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $query: BizQuery!
    $orderBy: BizOrder!
  ) {
    queryBizCompany(
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
          externalId
          environmentId
          data
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

export const createBizUserOnSegment = gql`
  mutation createBizUserOnSegment($data: CreateBizUserOnSegment!) {
    createBizUserOnSegment(data: $data) {
      success
      count
    }
  }
`;

export const deleteBizUserOnSegment = gql`
  mutation deleteBizUserOnSegment($data: DeleteBizUserOnSegment!) {
    deleteBizUserOnSegment(data: $data) {
      success
      count
    }
  }
`;

export const deleteBizUser = gql`
  mutation deleteBizUser($data: BizUserOrCompanyIdsInput!) {
    deleteBizUser(data: $data) {
      success
      count
    }
  }
`;

export const deleteBizCompany = gql`
  mutation deleteBizCompany($data: BizUserOrCompanyIdsInput!) {
    deleteBizCompany(data: $data) {
      success
      count
    }
  }
`;
export const createBizCompanyOnSegment = gql`
  mutation createBizCompanyOnSegment($data: CreateBizCompanyOnSegment!) {
    createBizCompanyOnSegment(data: $data) {
      success
      count
    }
  }
`;

export const deleteBizCompanyOnSegment = gql`
  mutation deleteBizCompanyOnSegment($data: DeleteBizCompanyOnSegment!) {
    deleteBizCompanyOnSegment(data: $data) {
      success
      count
    }
  }
`;

export const deleteSession = gql`
  mutation deleteSession($sessionId: String!) {
    deleteSession(sessionId: $sessionId)
  }
`;

export const endSession = gql`
  mutation endSession($sessionId: String!) {
    endSession(sessionId: $sessionId)
  }
`;

export const querySessionDetail = gql`
  query querySessionDetail($sessionId: String!) {
    querySessionDetail(sessionId: $sessionId) {
      id
      state
      createdAt
      contentId
      data
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
`;
