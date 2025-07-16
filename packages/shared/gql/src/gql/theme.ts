import { gql } from '@apollo/client';

export const getTheme = gql`
  query getTheme($themeId: String!) {
    getTheme(themeId: $themeId) {
      id
      name
      projectId
      createdAt
      updatedAt
      settings
      isDefault
      isSystem
      variations
    }
  }
`;

export const createTheme = gql`
  mutation createTheme(
    $name: String!
    $projectId: String!
    $settings: JSON!
    $isDefault: Boolean!
  ) {
    createTheme(
      data: {
        name: $name
        projectId: $projectId
        settings: $settings
        isDefault: $isDefault
      }
    ) {
      id
    }
  }
`;

export const updateTheme = gql`
  mutation updateTheme(
    $id: String!
    $name: String!
    $settings: JSON
    $isDefault: Boolean
    $variations: JSON
  ) {
    updateTheme(
      data: { id: $id, name: $name, settings: $settings, isDefault: $isDefault, variations: $variations }
    ) {
      id
    }
  }
`;

export const copyTheme = gql`
  mutation copyTheme($id: String!, $name: String!) {
    copyTheme(data: { id: $id, name: $name }) {
      id
    }
  }
`;

export const deleteTheme = gql`
  mutation deleteTheme($id: String!) {
    deleteTheme(data: { id: $id }) {
      id
    }
  }
`;

export const listThemes = gql`
  query listThemes($projectId: String!) {
    listThemes(projectId: $projectId) {
      id
      name
      projectId
      createdAt
      updatedAt
      settings
      isDefault
      isSystem
      variations
    }
  }
`;

export const setDefaultTheme = gql`
  mutation setDefaultTheme($themeId: String!) {
    setDefaultTheme(themeId: $themeId) {
      id
    }
  }
`;
