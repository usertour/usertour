/** An attribute definition to add to a project — what AttributesService.create takes. */
export type NewAttribute = {
  bizType: number;
  projectId: string;
  displayName: string;
  codeName: string;
  description?: string;
  dataType: number;
};
