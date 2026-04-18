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
};

export enum SegmentDataTypes {
  ALL = 1,
  CONDITION = 2,
  MANUAL = 3,
}
