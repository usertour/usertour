import { gql } from '@apollo/client';

export const createAttribute = gql`
  mutation createAttribute($data: CreateAttributeInput!) {
    createAttribute(data: $data) {
      id
      codeName
    }
  }
`;

export const updateAttribute = gql`
  mutation updateAttribute($data: UpdateAttributeInput!) {
    updateAttribute(data: $data) {
      id
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
