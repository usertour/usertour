import { gql } from '@apollo/client';

export const createCheckoutSession = gql`
  mutation createCheckoutSession($data: CreateCheckoutSessionRequest!) {
    createCheckoutSession(data: $data)
  }
`;

export const createPortalSession = gql`
  mutation createPortalSession($projectId: String!) {
    createPortalSession(projectId: $projectId)
  }
`;

export const getSubscriptionPlans = gql`
  query getSubscriptionPlans {
    getSubscriptionPlans {
      id
      name
      price
      features
      interval
      currency
      description
    }
  }
`;

export const getSubscriptionByProjectId = gql`
  query getSubscriptionByProjectId($projectId: String!) {
    getSubscriptionByProjectId(projectId: $projectId) {
      projectId
      subscriptionId
      lookupKey
      planType
      interval
      status
      isTrial
      cancelAt
      overridePlan
      createdAt
      updatedAt
    }
  }
`;

export const getSubscriptionUsage = gql`
  query getSubscriptionUsage($projectId: String!) {
    getSubscriptionUsage(projectId: $projectId)
  }
`;
