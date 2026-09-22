/** Companies removed from a manual segment — what BizService.deleteBizCompanyOnSegment takes. */
export type SegmentCompanyRemoval = {
  bizCompanyIds: string[];
  segmentId: string;
};
