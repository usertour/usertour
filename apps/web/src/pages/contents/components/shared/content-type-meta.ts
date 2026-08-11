import { CONTENT_TYPE_PATH_SEGMENT } from '@usertour/constants';
import { ContentDataType } from '@usertour/types';

export interface ContentTypeMeta {
  dataType: ContentDataType;
  singular: string;
  plural: string;
  builderPathSegment: string;
  hasBuilder: boolean;
}

export const CONTENT_TYPE_META: Record<ContentDataType, ContentTypeMeta> = {
  [ContentDataType.FLOW]: {
    dataType: ContentDataType.FLOW,
    singular: 'flow',
    plural: 'flows',
    builderPathSegment: CONTENT_TYPE_PATH_SEGMENT[ContentDataType.FLOW],
    hasBuilder: true,
  },
  [ContentDataType.CHECKLIST]: {
    dataType: ContentDataType.CHECKLIST,
    singular: 'checklist',
    plural: 'checklists',
    builderPathSegment: CONTENT_TYPE_PATH_SEGMENT[ContentDataType.CHECKLIST],
    hasBuilder: true,
  },
  [ContentDataType.LAUNCHER]: {
    dataType: ContentDataType.LAUNCHER,
    singular: 'launcher',
    plural: 'launchers',
    builderPathSegment: CONTENT_TYPE_PATH_SEGMENT[ContentDataType.LAUNCHER],
    hasBuilder: true,
  },
  [ContentDataType.BANNER]: {
    dataType: ContentDataType.BANNER,
    singular: 'banner',
    plural: 'banners',
    builderPathSegment: CONTENT_TYPE_PATH_SEGMENT[ContentDataType.BANNER],
    hasBuilder: true,
  },
  [ContentDataType.TRACKER]: {
    dataType: ContentDataType.TRACKER,
    singular: 'event tracker',
    plural: 'event trackers',
    builderPathSegment: CONTENT_TYPE_PATH_SEGMENT[ContentDataType.TRACKER],
    hasBuilder: false,
  },
  [ContentDataType.RESOURCE_CENTER]: {
    dataType: ContentDataType.RESOURCE_CENTER,
    singular: 'resource center',
    plural: 'resource centers',
    builderPathSegment: CONTENT_TYPE_PATH_SEGMENT[ContentDataType.RESOURCE_CENTER],
    hasBuilder: true,
  },
  [ContentDataType.ANNOUNCEMENT]: {
    dataType: ContentDataType.ANNOUNCEMENT,
    singular: 'announcement',
    plural: 'announcements',
    builderPathSegment: CONTENT_TYPE_PATH_SEGMENT[ContentDataType.ANNOUNCEMENT],
    hasBuilder: false,
  },
};

export const getContentTypeMeta = (type?: ContentDataType | null): ContentTypeMeta =>
  CONTENT_TYPE_META[type ?? ContentDataType.FLOW] ?? CONTENT_TYPE_META[ContentDataType.FLOW];
