/** The fields of an event definition to change — what EventsService.update takes. */
export type EventChanges = {
  id: string;
  displayName?: string;
  codeName?: string;
  description?: string;
  deleted?: boolean;
  /** The full set the event carries; an update replaces the stored set. */
  attributeIds: string[];
  eventId?: string;
};
