export type ColumnSetting = {
  codeName: string;
  visible: boolean;
};

export type Segment = {
  id: string;
  bizType: string;
  environmentId: string;
  name: string;
  dataType: string;
  data: any;
  columns: ColumnSetting[] | null;
  createdAt: string;
  predefined: boolean;
  /** 'internal' for hand-made segments; a provider id when synced from an integration. */
  source?: string;
  /** The provider-side cohort id backing a synced segment. */
  sourceId?: string | null;
};

export enum SegmentDataTypes {
  ALL = 1,
  CONDITION = 2,
  MANUAL = 3,
}
