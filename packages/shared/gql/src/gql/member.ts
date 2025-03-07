import { gql } from '@apollo/client';

export const getMembers = gql`
  query userMembers($projectId: String!) {
    userMembers(projectId: $projectId) {
      id
      name
      token
      createdAt
    }
  }
`;

export const createMember = gql`
  mutation createMember($name: String!, $projectId: String!) {
    createMember(data: { name: $name, projectId: $projectId }) {
      id
      name
      token
    }
  }
`;

export const updateMember = gql`
  mutation updateMember($id: String!, $name: String!) {
    updateMember(data: { id: $id, name: $name }) {
      id
      name
      token
    }
  }
`;

export const deleteMember = gql`
  mutation deleteMember($id: String!) {
    deleteMember(data: { id: $id }) {
      id
    }
  }
`;
