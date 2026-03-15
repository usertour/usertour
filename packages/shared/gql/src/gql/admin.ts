import { gql } from '@apollo/client';

export const adminSettings = gql`
  query AdminSettings {
    adminSettings {
      instanceId
      projectCount
      licenseInfo {
        license
        payload {
          plan
          sub
          scope
          instanceId
          projectId
          projectLimit
          iat
          exp
          issuer
          features
        }
        isValid
        isExpired
        error
        daysRemaining
      }
    }
  }
`;

export const updateInstanceLicense = gql`
  mutation UpdateInstanceLicense($license: String!) {
    updateInstanceLicense(license: $license) {
      id
      instanceId
      license
    }
  }
`;

export const adminUsers = gql`
  query AdminUsers {
    adminUsers {
      id
      name
      email
      createdAt
      isSystemAdmin
      projectCount
    }
  }
`;

export const updateUserSystemAdmin = gql`
  mutation UpdateUserSystemAdmin($userId: String!, $isSystemAdmin: Boolean!) {
    updateUserSystemAdmin(userId: $userId, isSystemAdmin: $isSystemAdmin) {
      id
      isSystemAdmin
    }
  }
`;

export const adminProjects = gql`
  query AdminProjects {
    adminProjects {
      id
      name
      createdAt
      ownerName
      ownerEmail
      memberCount
      licenseSource
    }
  }
`;

export const adminCreateProject = gql`
  mutation AdminCreateProject($name: String!, $ownerUserId: String!) {
    adminCreateProject(name: $name, ownerUserId: $ownerUserId) {
      id
      name
    }
  }
`;
