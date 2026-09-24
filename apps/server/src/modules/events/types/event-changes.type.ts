/** The fields of an event definition to change — what EventsService.update takes. */
export type EventChanges = {
  id: string;
  displayName?: string;
  codeName?: string;
  description?: string;
  deleted?: boolean;
  attributeIds?: string[];
  eventId?: string;
};
