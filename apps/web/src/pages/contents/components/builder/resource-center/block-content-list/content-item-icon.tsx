import type { ContentListItem, ResourceCenterContentListBlock } from '@usertour/types';
import { LauncherIconSource } from '@usertour/types';
import { IconsList } from '@usertour/widget';

// Resolves the icon to render for a single content-list item in the
// builder preview. Per-item icon overrides take precedence; falling
// back to the block-level default per content type
// (flowIcon* / checklistIcon* on the block). INHERIT routes to that
// default; NONE renders nothing.

export interface ContentItemIconProps {
  item: ContentListItem;
  block: ResourceCenterContentListBlock;
}

export const ContentItemIcon = ({ item, block }: ContentItemIconProps) => {
  const source = item.iconSource;

  let resolvedSource: LauncherIconSource;
  let resolvedType: string;
  let resolvedUrl: string | undefined;

  if (!source || source === LauncherIconSource.INHERIT) {
    if (item.contentType === 'flow') {
      resolvedSource = block.flowIconSource;
      resolvedType = block.flowIconType;
      resolvedUrl = block.flowIconUrl;
    } else {
      resolvedSource = block.checklistIconSource;
      resolvedType = block.checklistIconType;
      resolvedUrl = block.checklistIconUrl;
    }
  } else if (source === LauncherIconSource.NONE) {
    return null;
  } else {
    resolvedSource = source;
    resolvedType = item.iconType ?? '';
    resolvedUrl = item.iconUrl;
  }

  if (resolvedSource === LauncherIconSource.NONE) {
    return null;
  }

  if (
    (resolvedSource === LauncherIconSource.UPLOAD || resolvedSource === LauncherIconSource.URL) &&
    resolvedUrl
  ) {
    return <img src={resolvedUrl} alt="" className="flex-shrink-0 object-contain w-4 h-4" />;
  }

  if (resolvedSource === LauncherIconSource.BUILTIN && resolvedType) {
    const iconItem = IconsList.find((i) => i.name === resolvedType);
    if (iconItem) {
      const Icon = iconItem.ICON;
      return <Icon size={16} className="flex-shrink-0" />;
    }
  }

  return null;
};

ContentItemIcon.displayName = 'ContentItemIcon';
