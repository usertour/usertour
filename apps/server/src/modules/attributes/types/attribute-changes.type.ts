/** The fields of an attribute definition to change — what AttributesService.update takes. */
export type AttributeChanges = {
  id: string;
  bizType?: number;
  displayName?: string;
  codeName?: string;
  description?: string;
  dataType?: number;
};
