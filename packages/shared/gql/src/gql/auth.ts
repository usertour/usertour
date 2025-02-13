import { gql } from '@apollo/client';

export const createMagicLink = gql`
  mutation createMagicLink($email: String!) {
    createMagicLink(data: { email: $email }) {
      id
      email
    }
  }
`;

export const resendMagicLink = gql`
  mutation resendMagicLink($id: String!) {
    resendMagicLink(data: { id: $id }) {
      id
      email
    }
  }
`;

export const signOut = gql`
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

export const signUp = gql`
  mutation signUp(
    $code: String!
    $password: String!
    $userName: String!
    $companyName: String!
  ) {
    signup(
      data: {
        code: $code
        password: $password
        userName: $userName
        companyName: $companyName
      }
    ) {
      accessToken
      refreshToken
      user {
        id
        email
      }
    }
  }
`;

export const resetUserPassword = gql`
  mutation resetUserPassword($email: String!) {
    resetUserPassword(data: { email: $email }) {
      success
    }
  }
`;

export const updateUserPassword = gql`
  mutation resetUserPassword($email: String!) {
    resetUserPassword(data: { email: $email }) {
      success
    }
  }
`;

export const resetUserPasswordByCode = gql`
  mutation resetUserPasswordByCode($code: String!, $password: String!) {
    resetUserPasswordByCode(data: { code: $code, password: $password }) {
      success
    }
  }
`;
