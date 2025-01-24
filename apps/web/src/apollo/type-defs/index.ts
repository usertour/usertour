import { gql } from "@apollo/client";

export const typeDefs = gql`
    type Lang {
        lng: String!
    }

    type LocalUser {
        isLoggedIn: Boolean!
    }

    type Query {
        i18n: Lang!
        localUser: LocalUser!
    }

    type Mutation {
        UpdateLocalUser(isLoggedIn: Boolean!): Boolean
        updateLanguage(language: String!): Boolean
        signOut: Boolean
    }

    directive @client on FIELD
`;
