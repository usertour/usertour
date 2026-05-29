import { gql } from '@apollo/client';

export const createAttribute = gql`
  mutation createAttribute($data: CreateAttributeInput!) {
    createAttribute(data: $data) {
      id
      codeName
    }
  }
`;

// Returns the same selection set as `listAttributes` so Apollo's
// normalized cache auto-merges the updated row by __typename:id.
// Without this, the response carries only `{ id }` and the cached
// entity keeps its stale displayName / codeName / description.
export const updateAttribute = gql`
  mutation updateAttribute($data: UpdateAttributeInput!) {
    updateAttribute(data: $data) {
      id
      bizType
      codeName
      displayName
      projectId
      dataType
      description
      createdAt
      predefined
    }
  }
`;

export const listAttributes = gql`
  query listAttributes($projectId: String!, $bizType: Int!) {
    listAttributes(projectId: $projectId, bizType: $bizType) {
      id
      bizType
      codeName
      displayName
      projectId
      dataType
      description
      createdAt
      predefined
    }
  }
`;

export const deleteAttribute = gql`
  mutation deleteAttribute($id: ID!) {
    deleteAttribute(data: { id: $id }) {
      id
    }
  }
`;
