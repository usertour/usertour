import { gql } from '@apollo/client';

export const getUserInfo = gql`
  query me {
    me {
      id
      name
      avatarUrl
      email
      createdAt
      updatedAt
      isOAuthUser
      isSystemAdmin
      twoFactorEnabled
      twoFactorAvailable
      projects {
        id
        role
        capabilities
        actived
        allowedEnvironmentIds
        project {
          id
          name
          logoUrl
          subscriptionId
          customerId
        }
      }
    }
  }
`;

// Returns the fields `getUserInfo` (`me`) reads so Apollo's normalized
// cache auto-merges the updated User entity by __typename:id; the
// AppContext facade then re-emits without a manual refetch.
export const updateUser = gql`
  mutation updateUser($name: String!, $avatarUrl: String) {
    updateUser(data: { name: $name, avatarUrl: $avatarUrl }) {
      id
      name
      avatarUrl
    }
  }
`;

export const updateEmail = gql`
  mutation changeEmail($email: String!, $password: String!) {
    changeEmail(data: { email: $email, password: $password }) {
      id
      email
    }
  }
`;

export const changePassword = gql`
  mutation changePassword($oldPassword: String!, $newPassword: String!) {
    changePassword(
      data: { oldPassword: $oldPassword, newPassword: $newPassword }
    ) {
      id
    }
  }
`;

export const logout = gql`
  mutation logout {
    logout
  }
`;

export const createOwnedProject = gql`
  mutation createOwnedProject($name: String!) {
    createOwnedProject(data: { name: $name }) {
      id
      name
    }
  }
`;
