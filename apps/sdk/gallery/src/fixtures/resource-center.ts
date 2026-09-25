import { DEFAULT_RESOURCE_CENTER_DATA } from '@usertour/constants';
import {
  LauncherIconSource,
  ResourceCenterBlockType,
  type ResourceCenterData,
  type RichTextNode,
} from '@usertour/types';
import { paragraph, row, strongParagraph } from './content';

const label = (text: string): RichTextNode[] => [{ type: 'paragraph', children: [{ text }] }];

const always = { onlyShowBlock: false, onlyShowBlockConditions: [] };

/** A two-tab resource center: a home tab (welcome, divider, actions) and a help tab. */
export const twoTabResourceCenter: ResourceCenterData = {
  ...DEFAULT_RESOURCE_CENTER_DATA,
  tabs: [
    {
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
        {
          id: 'docs',
          type: ResourceCenterBlockType.ACTION,
          name: label('Documentation'),
          iconSource: LauncherIconSource.BUILTIN,
          iconType: 'book-open-fill',
          clickedActions: [],
          ...always,
        },
        {
          id: 'feedback',
          type: ResourceCenterBlockType.ACTION,
          name: label('Send feedback'),
          iconSource: LauncherIconSource.BUILTIN,
          iconType: 'chat1-line',
          clickedActions: [],
          ...always,
        },
      ],
    },
    {
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
    },
  ],
};
