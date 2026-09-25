import { ResourceCenterWidget } from '@/components/resource-center';
import { buildResourceCenterSnapshot, createFakeResourceCenter } from '../fake/resource-center';
import { twoTabResourceCenter } from '../fixtures/resource-center';
import { defaultTheme } from '../fixtures/theme';
import { BlankPage } from './hosts';
import type { GalleryCase } from './types';

const resourceCenterWidget = (expanded: boolean) => () => {
  const { resourceCenter } = createFakeResourceCenter(
    buildResourceCenterSnapshot({ data: twoTabResourceCenter, theme: defaultTheme, expanded }),
  );
  return <ResourceCenterWidget resourceCenter={resourceCenter} />;
};

export const resourceCenterCases: Record<string, GalleryCase> = {
  'resource-center-collapsed': { host: BlankPage, widget: resourceCenterWidget(false) },
  'resource-center-expanded': { host: BlankPage, widget: resourceCenterWidget(true) },
};
