import { gql } from "@apollo/client";

export const getLanguage = gql`
    query GetLanguage {
        i18n @client {
            lng
        }
    }
`;

export const updateLanguage = gql`
    mutation UpdateLanguage($language: String!) {
        updateLanguage(language: $language) @client
    }
`;
