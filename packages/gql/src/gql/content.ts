import { gql } from '@apollo/client';

// Cache contract: editedVersion (and getContentVersion) share the Version:id
// cache entry, and Steps normalize by id across the detail + builder views.
// Because this document selects editedVersion.steps, the server's editedVersion
// resolver MUST include steps — otherwise GraphQL returns steps: null and wipes
// the list from every view on that Version (this regressed the detail step list
// once). Keep any relation selected here in sync with what its resolver returns;
// see content.resolver.ts editedVersion ResolveField for the server half.
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
  mutation updateContentVersion(
    $versionId: String!
    $content: VersionInput!
    $expectedUpdatedAt: DateTime
  ) {
    updateContentVersion(
      data: { versionId: $versionId, content: $content, expectedUpdatedAt: $expectedUpdatedAt }
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

export const listVersionLocalizations = gql`
  query listVersionLocalizations($versionId: String!) {
    listVersionLocalizations(versionId: $versionId) {
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

export const upsertVersionLocalization = gql`
  mutation upsertVersionLocalization($data: VersionUpdateLocalizationInput!) {
    upsertVersionLocalization(data: $data) {
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
