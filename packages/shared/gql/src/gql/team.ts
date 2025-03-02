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
  mutation inviteTeamMember($projectId: String!, $name: String!, $email: String!, $role: Role!) {
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

export const cancelInvite = gql`
  mutation cancelInvite($projectId: String!, $inviteId: String!) {
    cancelInvite(data: { projectId: $projectId, inviteId: $inviteId } )
  }
`;

export const removeTeamMember = gql`
  mutation removeTeamMember($projectId: String!, $userId: String!) {
    removeTeamMember(data: { projectId: $projectId, userId: $userId } )
  }
`;

export const changeTeamMemberRole = gql`
  mutation changeTeamMemberRole($projectId: String!, $userId: String!, $role: Role!) {
    changeTeamMemberRole(data: { projectId: $projectId, userId: $userId, role: $role } )
  }
`;

export const getInvite = gql`
  query getInvite($inviteId: String!) {
    getInvite(inviteId: $inviteId) {
      id
      name
      email
      role
      createdAt
      user {
        id
        name
        email
        avatarUrl
      }
      project {
        id
        name
      }
    }
  }
`;
