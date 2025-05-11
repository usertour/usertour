import { gql } from '@apollo/client';

export const updateProjectName = gql`
  mutation updateProjectName($projectId: String!, $name: String!) {
    updateProjectName(projectId: $projectId, name: $name) {
      id
      name
    }
  }
`;
