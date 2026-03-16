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
  query AdminUsers($query: String, $page: Int, $pageSize: Int) {
    adminUsers(query: $query, page: $page, pageSize: $pageSize) {
      items {
        id
        name
        email
        createdAt
        isSystemAdmin
        disabled
        projectCount
      }
      total
      page
      pageSize
    }
  }
`;

export const adminCreateUser = gql`
  mutation AdminCreateUser($name: String!, $email: String!, $password: String!) {
    adminCreateUser(name: $name, email: $email, password: $password) {
      id
      name
      email
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

export const updateUserDisabled = gql`
  mutation UpdateUserDisabled($userId: String!, $disabled: Boolean!) {
    updateUserDisabled(userId: $userId, disabled: $disabled) {
      id
      disabled
    }
  }
`;

export const adminProjects = gql`
  query AdminProjects($query: String, $page: Int, $pageSize: Int) {
    adminProjects(query: $query, page: $page, pageSize: $pageSize) {
      items {
        id
        name
        createdAt
        ownerName
        ownerEmail
        memberCount
        licenseSource
      }
      total
      page
      pageSize
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

export const adminProjectMembers = gql`
  query AdminProjectMembers($projectId: String!) {
    adminProjectMembers(projectId: $projectId) {
      id
      userId
      name
      email
      role
      isOwner
    }
  }
`;

export const adminAddProjectMember = gql`
  mutation AdminAddProjectMember($projectId: String!, $userId: String!, $role: String!) {
    adminAddProjectMember(projectId: $projectId, userId: $userId, role: $role)
  }
`;

export const adminChangeProjectMemberRole = gql`
  mutation AdminChangeProjectMemberRole($projectId: String!, $userId: String!, $role: String!) {
    adminChangeProjectMemberRole(projectId: $projectId, userId: $userId, role: $role)
  }
`;

export const adminTransferProjectOwnership = gql`
  mutation AdminTransferProjectOwnership($projectId: String!, $userId: String!) {
    adminTransferProjectOwnership(projectId: $projectId, userId: $userId)
  }
`;

export const adminRemoveProjectMember = gql`
  mutation AdminRemoveProjectMember($projectId: String!, $userId: String!) {
    adminRemoveProjectMember(projectId: $projectId, userId: $userId)
  }
`;
