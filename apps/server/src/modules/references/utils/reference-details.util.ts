/**
 * Structured form of a reference list for error `details` (GraphQL extensions):
 * the first five, deduped, and how many more.
 */
export const referenceDetails = (references: { kind: string; name: string }[]) => {
  const unique = [...new Map(references.map((ref) => [`${ref.kind}:${ref.name}`, ref])).values()];
  return { references: unique.slice(0, 5), more: Math.max(0, unique.length - 5) };
};
