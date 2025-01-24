import { gql } from "@apollo/client";

export const createPresignedUrl = gql`
  mutation createPresignedUrl($fileName: String!, $storageType: String!) {
    createPresignedUrl(data: { fileName: $fileName, storageType: $storageType }) {
      signedUrl
      cdnUrl
    }
  }
`;
