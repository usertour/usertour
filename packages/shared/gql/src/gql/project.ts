import { gql } from '@apollo/client';

export const updateProjectName = gql`
  mutation updateProjectName($projectId: String!, $name: String!) {
    updateProjectName(projectId: $projectId, name: $name) {
      id
      name
    }
  }
`;

export const getProjectLicenseInfo = gql`
  query GetProjectLicenseInfo($projectId: String!) {
    getProjectLicenseInfo(projectId: $projectId) {
      license
      payload {
        plan
        sub
        projectId
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
`;

export const updateProjectLicense = gql`
  mutation UpdateProjectLicense($projectId: String!, $license: String!) {
    updateProjectLicense(projectId: $projectId, license: $license) {
      id
      name
      license
    }
  }
`;
