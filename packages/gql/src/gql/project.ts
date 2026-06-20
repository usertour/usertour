import { gql } from '@apollo/client';

export const updateProject = gql`
  mutation updateProject($projectId: String!, $name: String, $logoUrl: String) {
    updateProject(projectId: $projectId, name: $name, logoUrl: $logoUrl) {
      id
      name
      logoUrl
    }
  }
`;

export const getProjectConfig = gql`
  query GetProjectConfig($projectId: String!) {
    getProjectConfig(projectId: $projectId) {
      removeBranding
      customCss
      ssoOidc
      ssoSaml
      planType
    }
  }
`;

export const getProjectLicenseInfo = gql`
  query GetProjectLicenseInfo($projectId: String!) {
    getProjectLicenseInfo(projectId: $projectId) {
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
    }
  }
`;
