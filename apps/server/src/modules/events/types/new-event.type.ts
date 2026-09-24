/** An event definition to add to a project — what EventsService.create takes. */
export type NewEvent = {
  displayName: string;
  codeName: string;
  description?: string;
  deleted?: boolean;
  projectId: string;
  attributeIds: string[];
  eventId?: string;
};
