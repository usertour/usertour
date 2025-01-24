import { gql } from "@apollo/client";

export const getUserEnvironments = gql`
  query userEnvironments($projectId: String!) {
    userEnvironments(projectId: $projectId) {
      id
      name
      token
      createdAt
    }
  }
`;

export const createEnvironments = gql`
  mutation createEnvironments($name: String!, $projectId: String!) {
    createEnvironments(data: { name: $name, projectId: $projectId }) {
      id
      name
      token
    }
  }
`;

export const updateEnvironments = gql`
  mutation updateEnvironments($id: String!, $name: String!) {
    updateEnvironments(data: { id: $id, name: $name }) {
      id
      name
      token
    }
  }
`;

export const deleteEnvironments = gql`
  mutation deleteEnvironments($id: String!) {
    deleteEnvironments(data: { id: $id }) {
      id
    }
  }
`;
