import { gql } from '@apollo/client';

export const getLocalUser = gql`
  query LocalUser {
    localUser @client {
      isLoggedIn
    }
  }
`;

export const updateLocalUser = gql`
  mutation UpdateLocalUser($isLoggedIn: Boolean!) {
    UpdateLocalUser(isLoggedIn: $isLoggedIn) @client
  }
`;

export const localUserSignOut = gql`
  mutation SignOut {
    signOut @client
  }
`;

export const login = gql`
  mutation Login($email: String!, $password: String!) {
    login(data: { email: $email, password: $password }) {
      accessToken
      refreshToken
      user {
        id
        email
      }
    }
  }
`;

export const getUserInfo = gql`
  query me {
    me {
      id
      name
      avatarUrl
      email
      projects {
        id
        role
        actived
        project {
          id
          name
          logoUrl
        }
      }
    }
  }
`;

export const getUserEnvironments = gql`
  query userEnvironments($projectId: String!) {
    userEnvironments(projectId: $projectId) {
      id
      name
      avatarUrl
      email
    }
  }
`;
