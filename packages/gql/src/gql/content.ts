import { gql } from '@apollo/client';

export const getContent = gql`
  query getContent($contentId: String!) {
    getContent(contentId: $contentId) {
      id
      name
      buildUrl
      config
      environmentId
      editedVersionId
      publishedVersionId
      published
      deleted
      publishedAt
      createdAt
      updatedAt
      type
      publishedVersion {
        id
        sequence
        createdAt
        updatedAt
      }
      editedVersion {
        id
        sequence
        contentId
        themeId
        config
        data
        scheduledAt
        createdAt
        updatedAt
        steps {
          id
          name
          type
          cvid
          sequence
          data
          trigger
          themeId
          screenshot
          target
          setting
          createdAt
          updatedAt
        }
      }
      steps {
        id
        name
        cvid
        type
        trigger
        sequence
        data
        themeId
        screenshot
        sequence
        target
        setting
      }
      contentOnEnvironments {
        id
        published
        publishedAt
        publishedVersionId
        environmentId
        environment {
          id
          name
        }
        publishedVersion {
          id
          sequence
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const createContent = gql`
  mutation createContent(
    $type: String!
    $name: String!
    $environmentId: String!
    $buildUrl: String
    $data: JSON
    $steps: [StepInput!]
  ) {
    createContent(
      data: {
        type: $type
        name: $name
        environmentId: $environmentId
        buildUrl: $buildUrl
        data: $data
        steps: $steps
      }
    ) {
      id
      name
      buildUrl
      environmentId
      editedVersionId
      publishedVersionId
      published
      deleted
      publishedAt
      createdAt
      updatedAt
    }
  }
`;

export const addContentSteps = gql`
  mutation addContentSteps(
    $contentId: String!
    $versionId: String!
    $themeId: String!
    $steps: [StepInput!]!
    $data: JSON
  ) {
    addContentSteps(
      data: {
        contentId: $contentId
        versionId: $versionId
        themeId: $themeId
        steps: $steps
        data: $data
      }
    ) {
      id
      sequence
      contentId
      themeId
      config
      data
      scheduledAt
      createdAt
      updatedAt
      steps {
        id
        name
        type
        cvid
        sequence
        data
        trigger
        themeId
        screenshot
        target
        setting
        createdAt
        updatedAt
      }
    }
  }
`;

export const addContentStep = gql`
  mutation addContentStep($data: CreateStepInput!) {
    addContentStep(data: $data) {
      id
      name
      cvid
      type
      sequence
      data
      themeId
      screenshot
      sequence
      target
      setting
    }
  }
`;

export const updateContentStep = gql`
  mutation updateContentStep($stepId: String!, $data: UpdateStepInput!) {
    updateContentStep(stepId: $stepId, data: $data) {
      id
      name
      type
      cvid
      sequence
      data
      trigger
      themeId
      screenshot
      target
      setting
      createdAt
      updatedAt
    }
  }
`;

export const queryContent = gql`
  query queryContent(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $query: ContentQuery!
    $orderBy: ContentOrder!
  ) {
    queryContent(
      first: $first
      last: $last
      after: $after
      before: $before
      query: $query
      orderBy: $orderBy
    ) {
      totalCount
      edges {
        cursor
        node {
          id
          name
          buildUrl
          type
          environmentId
          editedVersionId
          publishedVersionId
          published
          deleted
          publishedAt
          createdAt
          updatedAt
          steps {
            id
            name
            cvid
            sequence
          }
          contentOnEnvironments {
            id
            published
            publishedAt
            publishedVersionId
            environmentId
            environment {
              id
              name
            }
          }
        }
      }
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const updateContent = gql`
  mutation updateContent($contentId: String!, $content: UpdateContentInput!) {
    updateContent(data: { contentId: $contentId, content: $content }) {
      id
      name
      buildUrl
      environmentId
      config
      type
      editedVersionId
      publishedVersionId
      published
      publishedAt
      updatedAt
    }
  }
`;

export const duplicateContent = gql`
  mutation duplicateContent(
    $contentId: String!
    $name: String!
    $targetEnvironmentId: String
  ) {
    duplicateContent(
      data: {
        contentId: $contentId
        name: $name
        targetEnvironmentId: $targetEnvironmentId
      }
    ) {
      id
      name
    }
  }
`;

export const publishedContentVersion = gql`
  mutation publishedContentVersion($versionId: String!, $environmentId: String!) {
    publishedContentVersion(data: { versionId: $versionId, environmentId: $environmentId }) {
      id
    }
  }
`;

export const restoreContentVersion = gql`
  mutation restoreContentVersion($versionId: String!) {
    restoreContentVersion(data: { versionId: $versionId }) {
      id
    }
  }
`;

export const unpublishedContentVersion = gql`
  mutation unpublishedContentVersion($contentId: String!, $environmentId: String!) {
    unpublishedContentVersion(data: { contentId: $contentId, environmentId: $environmentId }) {
      success
    }
  }
`;

export const deleteContent = gql`
  mutation deleteContent($contentId: String!) {
    deleteContent(data: { contentId: $contentId }) {
      success
    }
  }
`;

export const createContentVersion = gql`
  mutation createContentVersion($data: ContentVersionInput!) {
    createContentVersion(data: $data) {
      id
      sequence
      contentId
    }
  }
`;

export const updateContentVersion = gql`
  mutation updateContentVersion($versionId: String!, $content: VersionInput!) {
    updateContentVersion(data: { versionId: $versionId, content: $content }) {
      id
      sequence
      contentId
      themeId
      config
      data
      scheduledAt
      createdAt
      updatedAt
      steps {
        id
        name
        type
        cvid
        sequence
        data
        trigger
        themeId
        screenshot
        target
        setting
        createdAt
        updatedAt
      }
    }
  }
`;

export const getContentVersion = gql`
  query getContentVersion($versionId: String!) {
    getContentVersion(versionId: $versionId) {
      id
      sequence
      contentId
      themeId
      config
      createdAt
      updatedAt
      scheduledAt
      data
      steps {
        id
        name
        type
        cvid
        sequence
        data
        trigger
        themeId
        screenshot
        sequence
        target
        setting
        createdAt
        updatedAt
      }
    }
  }
`;

export const listContentVersions = gql`
  query listContentVersions(
    $contentId: String!
    $first: Int
    $last: Int
    $after: String
    $before: String
  ) {
    listContentVersions(
      contentId: $contentId
      first: $first
      last: $last
      after: $after
      before: $before
    ) {
      totalCount
      edges {
        cursor
        node {
          id
          sequence
          contentId
          themeId
          createdAt
          updatedAt
          config
        }
      }
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const findManyVersionLocations = gql`
  query findManyVersionLocations($versionId: String!) {
    findManyVersionLocations(versionId: $versionId) {
      id
      createdAt
      updatedAt
      versionId
      localizationId
      enabled
      localized
      backup
    }
  }
`;

export const updateVersionLocationData = gql`
  mutation updateVersionLocationData($data: VersionUpdateLocalizationInput!) {
    updateVersionLocationData(data: $data) {
      id
    }
  }
`;
