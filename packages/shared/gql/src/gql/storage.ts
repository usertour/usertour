import { gql } from '@apollo/client';

export const createPresignedUrl = gql`
  mutation createPresignedUrl(
    $fileName: String!
    $storageType: String!
    $contentType: String
  ) {
    createPresignedUrl(
      data: {
        fileName: $fileName
        storageType: $storageType
        contentType: $contentType
      }
    ) {
      signedUrl
      cdnUrl
    }
  }
`;
