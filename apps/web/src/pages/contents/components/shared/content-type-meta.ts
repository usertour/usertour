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
    builderPathSegment: 'flows',
    hasBuilder: true,
  },
  [ContentDataType.CHECKLIST]: {
    dataType: ContentDataType.CHECKLIST,
    singular: 'checklist',
    plural: 'checklists',
    builderPathSegment: 'checklists',
    hasBuilder: true,
  },
  [ContentDataType.LAUNCHER]: {
    dataType: ContentDataType.LAUNCHER,
    singular: 'launcher',
    plural: 'launchers',
    builderPathSegment: 'launchers',
    hasBuilder: true,
  },
  [ContentDataType.BANNER]: {
    dataType: ContentDataType.BANNER,
    singular: 'banner',
    plural: 'banners',
    builderPathSegment: 'banners',
    hasBuilder: true,
  },
  [ContentDataType.TRACKER]: {
    dataType: ContentDataType.TRACKER,
    singular: 'event tracker',
    plural: 'event trackers',
    builderPathSegment: 'trackers',
    hasBuilder: false,
  },
  [ContentDataType.RESOURCE_CENTER]: {
    dataType: ContentDataType.RESOURCE_CENTER,
    singular: 'resource center',
    plural: 'resource centers',
    builderPathSegment: 'resource-centers',
    hasBuilder: true,
  },
};

export const getContentTypeMeta = (type?: ContentDataType | null): ContentTypeMeta =>
  CONTENT_TYPE_META[type ?? ContentDataType.FLOW] ?? CONTENT_TYPE_META[ContentDataType.FLOW];
