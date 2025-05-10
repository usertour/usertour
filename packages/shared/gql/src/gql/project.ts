import { gql } from '@apollo/client';

export const updateProject = gql`
  mutation updateProject($id: String!, $name: String!) {
    updateProject(id: $id, data: { name: $name }) {
      id
      name
    }
  }
`;
