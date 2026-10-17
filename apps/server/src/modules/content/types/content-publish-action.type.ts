/** What a publish record records. The object is the one list; the type derives from it. */
export const ContentPublishAction = { publish: 'publish', unpublish: 'unpublish' } as const;

export type ContentPublishAction = keyof typeof ContentPublishAction;
