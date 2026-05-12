import { gql } from '@apollo/client';

export const createLocalization = gql`
  mutation createLocalization($data: CreateLocalizationInput!) {
    createLocalization(data: $data) {
      id
    }
  }
`;

export const updateLocalization = gql`
  mutation updateLocalization($data: UpdateLocalizationInput!) {
    updateLocalization(data: $data) {
      id
    }
  }
`;

export const listLocalizations = gql`
  query listLocalizations($projectId: String!) {
    listLocalizations(projectId: $projectId) {
      id
      locale
      name
      projectId
      code
      createdAt
      isDefault
    }
  }
`;

export const deleteLocalization = gql`
  mutation deleteLocalization($id: ID!) {
    deleteLocalization(data: { id: $id }) {
      id
    }
  }
`;

export const setDefaultLocalization = gql`
  mutation setDefaultLocalization($id: String!) {
    setDefaultLocalization(id: $id) {
      id
    }
  }
`;
