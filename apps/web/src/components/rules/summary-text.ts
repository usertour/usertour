// Class for the text portion of a chip summary. Both editors wrap long
// content so the user can read the full value without opening the editor.
// `break-words` (overflow-wrap: break-word) rather than `break-all`: English
// / URL-like values only break inside a token when the whole token can't fit
// on a line, so phrases like "/visualization/data-analysis" stay readable
// instead of being chopped mid-word at the line edge.
export const summaryTextClass = 'min-w-0 whitespace-normal break-words';
