/**
 * Calculate percentage rate with safe division
 * @param numerator - The numerator value
 * @param denominator - The denominator value
 * @returns Rounded percentage (0-100), returns 0 if denominator is 0
 */
export const calculateRate = (numerator: number, denominator: number): number => {
  if (denominator === 0) return 0;
  return Math.min(Math.round((numerator / denominator) * 100), 100);
};

/**
 * Calculate unique failure rate for tooltip target missing
 * @param uniqueTooltipTargetMissingCount - Number of unique tooltip target missing events
 * @param uniqueViews - Number of unique views
 * @returns Failure rate as percentage (0-100)
 */
export const calculateUniqueFailureRate = (
  uniqueTooltipTargetMissingCount: number,
  uniqueViews: number,
): number => {
  return calculateRate(uniqueTooltipTargetMissingCount, uniqueViews);
};

/**
 * Calculate total failure rate for tooltip target missing
 * @param tooltipTargetMissingCount - Total number of tooltip target missing events
 * @param totalViews - Total number of views
 * @returns Failure rate as percentage (0-100)
 */
export const calculateTotalFailureRate = (
  tooltipTargetMissingCount: number,
  totalViews: number,
): number => {
  return calculateRate(tooltipTargetMissingCount, totalViews);
};
