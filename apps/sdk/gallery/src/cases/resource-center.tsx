import type { ResourceCenterData, ResourceCenterPlacement } from '@usertour/types';
import { ResourceCenterWidget } from '@/components/resource-center';
import { buildResourceCenterSnapshot, createFakeResourceCenter } from '../fake/resource-center';
import {
  longHomeResourceCenter,
  newsResourceCenter,
  popupResourceCenter,
  renamedHomeResourceCenter,
  subPageResourceCenter,
  twoTabResourceCenter,
} from '../fixtures/resource-center';
import { BlankPage } from './hosts';
import type { CaseParams, GalleryCase } from './types';

/** `?placement=` (top-left, top-right, bottom-left, bottom-right) overrides the theme's corner. */
const resourceCenterWidget =
  (data: ResourceCenterData, expanded: boolean) =>
  ({ theme, search }: CaseParams) => {
    const placement = search.get('placement') as ResourceCenterPlacement | null;
    const placedTheme =
      placement && theme.resourceCenter
        ? { ...theme, resourceCenter: { ...theme.resourceCenter, placement } }
        : theme;
    const { resourceCenter } = createFakeResourceCenter(
      buildResourceCenterSnapshot({ data, theme: placedTheme, expanded }),
    );
    return <ResourceCenterWidget resourceCenter={resourceCenter} />;
  };

export const resourceCenterCases: Record<string, GalleryCase> = {
  'resource-center-collapsed': {
    host: BlankPage,
    widget: resourceCenterWidget(twoTabResourceCenter, false),
  },
  'resource-center-expanded': {
    host: BlankPage,
    widget: resourceCenterWidget(twoTabResourceCenter, true),
  },
  'resource-center-news': {
    host: BlankPage,
    widget: resourceCenterWidget(newsResourceCenter, true),
  },
  'resource-center-renamed-home': {
    host: BlankPage,
    widget: resourceCenterWidget(renamedHomeResourceCenter, true),
  },
  'resource-center-long-home': {
    host: BlankPage,
    widget: resourceCenterWidget(longHomeResourceCenter, true),
  },
  'resource-center-sub-pages': {
    host: BlankPage,
    widget: resourceCenterWidget(subPageResourceCenter, true),
  },
  'resource-center-popup': {
    host: BlankPage,
    widget: resourceCenterWidget(popupResourceCenter, false),
  },
};
