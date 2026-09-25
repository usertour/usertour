import { DEFAULT_RESOURCE_CENTER_DATA } from '@usertour/constants';
import {
  AnnouncementDistribution,
  AnnouncementPopupStyle,
  type ContentEditorRoot,
  LauncherIconSource,
  type PopupAnnouncement,
  type ResourceCenterBlock,
  ResourceCenterBlockType,
  type ResourceCenterData,
  type ResourceCenterTab,
  type RichTextNode,
} from '@usertour/types';
import { paragraph, row, strongParagraph } from './content';

const label = (text: string): RichTextNode[] => [{ type: 'paragraph', children: [{ text }] }];

const always = { onlyShowBlock: false, onlyShowBlockConditions: [] };

const action = (id: string, name: string, iconType = 'book-open-fill'): ResourceCenterBlock => ({
  id,
  type: ResourceCenterBlockType.ACTION,
  name: label(name),
  iconSource: LauncherIconSource.BUILTIN,
  iconType,
  clickedActions: [],
  ...always,
});

const subPage = (id: string, name: string, content: ContentEditorRoot[]): ResourceCenterBlock => ({
  id,
  type: ResourceCenterBlockType.SUB_PAGE,
  name: label(name),
  iconSource: LauncherIconSource.BUILTIN,
  iconType: 'play-line',
  content,
  ...always,
});

const homeTab: ResourceCenterTab = {
  id: 'home',
  name: 'Home',
  iconSource: LauncherIconSource.BUILTIN,
  iconType: 'home-line',
  blocks: [
    {
      id: 'welcome',
      type: ResourceCenterBlockType.RICH_TEXT,
      content: [
        row(strongParagraph('Welcome!')),
        row(paragraph('Guides, tutorials and support in one place.')),
      ],
      ...always,
    },
    { id: 'divider', type: ResourceCenterBlockType.DIVIDER, ...always },
    action('docs', 'Documentation'),
    action('feedback', 'Send feedback', 'chat1-line'),
  ],
};

const helpTab: ResourceCenterTab = {
  id: 'help',
  name: 'Help',
  iconSource: LauncherIconSource.BUILTIN,
  iconType: 'play-line',
  blocks: [
    {
      id: 'help-text',
      type: ResourceCenterBlockType.RICH_TEXT,
      content: [row(paragraph('Write to support@example.com and we reply within a day.'))],
      ...always,
    },
  ],
};

const newsTab: ResourceCenterTab = {
  id: 'news',
  name: 'News',
  iconSource: LauncherIconSource.BUILTIN,
  iconType: 'gift-line',
  blocks: [
    {
      id: 'announcements',
      type: ResourceCenterBlockType.ANNOUNCEMENT,
      name: label("What's new"),
      iconSource: LauncherIconSource.BUILTIN,
      iconType: 'gift-line',
      ...always,
    },
    action('changelog', 'Full changelog'),
  ],
};

/** A two-tab resource center: a home tab (welcome, divider, actions) and a help tab. */
export const twoTabResourceCenter: ResourceCenterData = {
  ...DEFAULT_RESOURCE_CENTER_DATA,
  tabs: [homeTab, helpTab],
};

/** Home plus a news tab holding the announcement feed, with three unread announcements. */
export const newsResourceCenter: ResourceCenterData = {
  ...DEFAULT_RESOURCE_CENTER_DATA,
  announcementUnreadCount: 3,
  tabs: [homeTab, newsTab],
};

/** The first tab renamed and given its own (image) icon. */
export const renamedHomeResourceCenter: ResourceCenterData = {
  ...DEFAULT_RESOURCE_CENTER_DATA,
  tabs: [
    {
      ...homeTab,
      name: 'Start here',
      iconSource: LauncherIconSource.URL,
      iconUrl: '/fixtures/photo.png',
    },
    helpTab,
  ],
};

/** A home tab with far more blocks than fit, so its body scrolls. */
export const longHomeResourceCenter: ResourceCenterData = {
  ...DEFAULT_RESOURCE_CENTER_DATA,
  tabs: [
    {
      ...homeTab,
      blocks: [
        ...homeTab.blocks,
        ...Array.from({ length: 14 }, (_, i) => action(`extra-${i + 1}`, `Extra link ${i + 1}`)),
      ],
    },
    helpTab,
  ],
};

/** A home tab listing two sub-pages (two, so neither auto-expands). */
export const subPageResourceCenter: ResourceCenterData = {
  ...DEFAULT_RESOURCE_CENTER_DATA,
  tabs: [
    {
      ...homeTab,
      blocks: [
        subPage('getting-started', 'Getting started', [
          row(paragraph('Step one: connect your data source.')),
        ]),
        subPage('faq', 'FAQ', [row(paragraph('Answers to common questions.'))]),
      ],
    },
    helpTab,
  ],
};

const popupAnnouncement: PopupAnnouncement = {
  id: 'shared-dashboards',
  versionId: 'shared-dashboards-v1',
  title: 'Shared dashboards are here',
  content: [row(paragraph('Invite your team and edit dashboards together.'))],
  moreEnabled: true,
  moreButtonText: '',
  level: AnnouncementDistribution.POPUP,
  time: '2026-03-10T12:00:00Z',
  moreContent: null,
  popupConfig: { style: AnnouncementPopupStyle.BUBBLE },
};

/** The news resource center with a new announcement waiting to pop up by its launcher. */
export const popupResourceCenter: ResourceCenterData = {
  ...newsResourceCenter,
  popupAnnouncement,
};
