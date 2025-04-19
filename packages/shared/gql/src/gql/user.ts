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
      projects {
        id
        role
        actived
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

export const updateUser = gql`
  mutation updateUser($name: String!, $avatarUrl: String) {
    updateUser(data: { name: $name, avatarUrl: $avatarUrl }) {
      id
    }
  }
`;

export const updateEmail = gql`
  mutation changeEmail($email: String!, $password: String!) {
    changeEmail(data: { email: $email, password: $password }) {
      id
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
