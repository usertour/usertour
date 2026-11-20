/**
 * Whether a target's box gives content something to point at: a width or a
 * height. A container whose children are all out of its flow has no height and
 * is still a line to point at; an element with neither is a point with nowhere
 * to point, as is an element no longer in the page, which measures 0×0.
 *
 * The SDK's element watcher and the widget's positioning both judge a target
 * by this, so content is never kept running for a target it will not show at.
 */
export function hasPointableSize(rect: { width: number; height: number }): boolean {
  return rect.width > 0 || rect.height > 0;
}
