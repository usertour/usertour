import { gql } from '@apollo/client';

export const createEvent = gql`
  mutation createEvent($data: CreateEventInput!) {
    createEvent(data: $data) {
      id
    }
  }
`;

export const updateEvent = gql`
  mutation updateEvent($data: UpdateEventInput!) {
    updateEvent(data: $data) {
      id
    }
  }
`;

export const listEvents = gql`
  query listEvents($projectId: String!) {
    listEvents(projectId: $projectId) {
      id
      codeName
      displayName
      projectId
      description
      predefined
      createdAt
    }
  }
`;

export const deleteEvent = gql`
  mutation deleteEvent($id: ID!) {
    deleteEvent(data: { id: $id }) {
      id
    }
  }
`;

export const listAttributeOnEvents = gql`
  query listAttributeOnEvents($eventId: String!) {
    listAttributeOnEvents(eventId: $eventId) {
      id
      eventId
      attributeId
    }
  }
`;
