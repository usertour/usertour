/** Users removed from a manual segment — what BizService.deleteBizUserOnSegment takes. */
export type SegmentUserRemoval = {
  bizUserIds: string[];
  segmentId: string;
};
