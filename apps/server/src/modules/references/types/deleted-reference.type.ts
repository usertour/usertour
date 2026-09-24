/** A soft-deleted definition that a version still references by id. */
export interface DeletedReference {
  kind: 'attribute' | 'event' | 'segment' | 'theme';
  id: string;
  /** codeName for attributes and events, name for segments and themes. */
  name: string;
}
