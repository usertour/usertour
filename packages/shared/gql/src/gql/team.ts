import { gql } from '@apollo/client';

export const getTeamMembers = gql`
  query getTeamMembers($projectId: String!) {
    getTeamMembers(projectId: $projectId) {
      id
      role
      createdAt
      user {
        id
        name
        email
        avatarUrl
      }
    }
  }
`;

export const getInvites = gql`
  query getInvites($projectId: String!) {
    getInvites(projectId: $projectId) {
      id
      name
      email
      role
      createdAt
    }
  }
`;

export const inviteTeamMember = gql`
  mutation inviteTeamMember($projectId: String!, $name: String!, $email: String!, $role: String!) {
    inviteTeamMember(
      data: {
        name: $name
        projectId: $projectId
        email: $email
        role: $role
      }
    )
 }
`;
