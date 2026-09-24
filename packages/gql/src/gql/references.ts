import { gql } from '@apollo/client';

export const listDefinitionReferences = gql`
  query listDefinitionReferences($projectId: String!, $kind: String!, $id: String!) {
    listDefinitionReferences(projectId: $projectId, kind: $kind, id: $id) {
      referrerKind
      id
      name
      contentType
      segmentBizType
      locations {
        surface
        step
        version
      }
    }
  }
`;
