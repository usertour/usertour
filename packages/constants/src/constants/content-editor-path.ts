import { ContentDataType } from '@usertour/types';

/**
 * Dashboard path segment per content type — the content detail page lives at
 * `{dashboard}/env/{envId}/{segment}/{contentId}/detail`. Single source for the
 * web router meta AND the server's `editorUrl` deep links in MCP responses: a
 * drift between the two would 404 the deep link, so neither side hand-writes
 * these strings.
 */
export const CONTENT_TYPE_PATH_SEGMENT: Record<ContentDataType, string> = {
  [ContentDataType.FLOW]: 'flows',
  [ContentDataType.CHECKLIST]: 'checklists',
  [ContentDataType.LAUNCHER]: 'launchers',
  [ContentDataType.BANNER]: 'banners',
  [ContentDataType.TRACKER]: 'trackers',
  [ContentDataType.RESOURCE_CENTER]: 'resource-centers',
  [ContentDataType.ANNOUNCEMENT]: 'announcements',
};
