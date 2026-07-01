import { ContentDataType } from '@usertour/types';

import { decompileContent } from './representation.decompile';
import { decompileActions, decompileWhen, DecompileResolvers } from './rules.decompile';
import { decompileText } from './text.decompile';
import {
  RepresentationResourceCenter,
  RepresentationResourceCenterBlock,
} from './resource-center.schema';

/** Decompile a resource-center `version.data` (ResourceCenterData) into its representation. */
export function decompileResourceCenter(
  data: unknown,
  r: DecompileResolvers,
): RepresentationResourceCenter {
  const d = (data ?? {}) as Record<string, any>;
  const tabs = Array.isArray(d.tabs) ? d.tabs : [];
  return {
    buttonText: typeof d.buttonText === 'string' ? d.buttonText : '',
    headerText: typeof d.headerText === 'string' ? d.headerText : '',
    tabs: tabs.map((t: Record<string, any>) => ({
      ...(typeof t.id === 'string' ? { id: t.id } : {}),
      name: typeof t.name === 'string' ? t.name : '',
      ...(icon(t.iconSource, t.iconType, t.iconUrl)
        ? { icon: icon(t.iconSource, t.iconType, t.iconUrl) }
        : {}),
      blocks: (Array.isArray(t.blocks) ? t.blocks : []).map((b: Record<string, any>) =>
        decompileBlock(b, r),
      ),
    })),
  };
}

// Returns `any` because it reads untyped internal data into the enum-typed
// representation icon (source is a LauncherIconSource literal at the schema level).
function icon(source: unknown, type: unknown, url: unknown): any {
  const o = {
    ...(source ? { source } : {}),
    ...(type ? { type } : {}),
    ...(url ? { url } : {}),
  };
  return Object.keys(o).length ? o : undefined;
}

function decompileBlock(
  b: Record<string, any>,
  r: DecompileResolvers,
): RepresentationResourceCenterBlock {
  const base = {
    ...(typeof b.id === 'string' ? { id: b.id } : {}),
    ...(b.onlyShowBlock ? { onlyShowWhen: decompileWhen(b.onlyShowBlockConditions, r) } : {}),
  };
  const ic = icon(b.iconSource, b.iconType, b.iconUrl);
  switch (b.type) {
    case 'richtext':
      return {
        ...base,
        type: 'richtext',
        ...(typeof b.name === 'string' ? { name: b.name } : {}),
        content: decompileContent(b.content, r).blocks,
      };
    case 'divider':
      return { ...base, type: 'divider', ...(typeof b.name === 'string' ? { name: b.name } : {}) };
    case 'action':
      return {
        ...base,
        type: 'action',
        name: decompileText(b.name),
        ...(ic ? { icon: ic } : {}),
        clickActions: decompileActions(b.clickedActions),
      };
    case 'sub-page':
      return {
        ...base,
        type: 'sub-page',
        name: decompileText(b.name),
        ...(ic ? { icon: ic } : {}),
        content: decompileContent(b.content, r).blocks,
      };
    case 'content-list':
      return {
        ...base,
        type: 'content-list',
        name: decompileText(b.name),
        ...(ic ? { icon: ic } : {}),
        ...(icon(b.flowIconSource, b.flowIconType, b.flowIconUrl)
          ? { flowIcon: icon(b.flowIconSource, b.flowIconType, b.flowIconUrl) }
          : {}),
        ...(icon(b.checklistIconSource, b.checklistIconType, b.checklistIconUrl)
          ? { checklistIcon: icon(b.checklistIconSource, b.checklistIconType, b.checklistIconUrl) }
          : {}),
        ...(typeof b.showSearchField === 'boolean' ? { showSearchField: b.showSearchField } : {}),
        items: (Array.isArray(b.contentItems) ? b.contentItems : []).map(
          (it: Record<string, any>) => ({
            content: typeof it.contentId === 'string' ? it.contentId : '',
            contentType:
              it.contentType === ContentDataType.CHECKLIST
                ? ContentDataType.CHECKLIST
                : ContentDataType.FLOW,
            ...(icon(it.iconSource, it.iconType, it.iconUrl)
              ? { icon: icon(it.iconSource, it.iconType, it.iconUrl) }
              : {}),
            ...(it.navigateUrl ? { navigateUrl: decompileText(it.navigateUrl) } : {}),
            ...(it.navigateOpenType ? { navigateOpenType: it.navigateOpenType } : {}),
            ...(it.onlyShowItem
              ? { onlyShowWhen: decompileWhen(it.onlyShowItemConditions, r) }
              : {}),
          }),
        ),
      };
    default:
      return {
        ...base,
        type: 'live-chat',
        name: decompileText(b.name),
        ...(ic ? { icon: ic } : {}),
        provider: b.liveChatProvider ?? 'custom',
        ...(typeof b.customLiveChatCode === 'string' ? { customCode: b.customLiveChatCode } : {}),
      };
  }
}
