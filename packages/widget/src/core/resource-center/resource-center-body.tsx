import { CSSProperties, Fragment, memo, useMemo } from 'react';
import type {
  ResourceCenterActionBlock,
  ResourceCenterContentListBlock,
  ResourceCenterDividerBlock,
  ResourceCenterLiveChatBlock,
  ResourceCenterRichTextBlock,
  ResourceCenterNavigableBlock,
  ResourceCenterPageEntry,
  ResourceCenterSubPageBlock,
  UserTourTypes,
} from '@usertour/types';
import { LauncherIconSource, ResourceCenterBlockType } from '@usertour/types';
import { cn } from '@usertour-packages/tailwind';
import { RiArrowRightSLine } from '@usertour-packages/icons';
import { ContentEditorSerialize } from '../../serialize/content-editor-serialize';
import { useResourceCenterContext, type ContentListDisplayItem } from './context';
import { serializeBlockName } from '@usertour/helpers';
import { IconsList } from '../launcher';
import { ResourceCenterCloseButton } from './resource-center-header';

// ============================================================================
// BlockIcon — unified icon rendering (replaces 5 duplicate renderIcon functions)
// ============================================================================

interface BlockIconProps {
  iconSource: LauncherIconSource;
  iconType: string;
  iconUrl?: string;
  size?: number;
  className?: string;
}

export const BlockIcon = memo(
  ({ iconSource, iconType, iconUrl, size = 20, className }: BlockIconProps) => {
    if (iconSource === LauncherIconSource.NONE) {
      return null;
    }
    if (
      (iconSource === LauncherIconSource.UPLOAD || iconSource === LauncherIconSource.URL) &&
      iconUrl
    ) {
      return (
        <img
          src={iconUrl}
          alt=""
          className={cn('flex-shrink-0 object-contain', className)}
          style={{ width: size, height: size }}
        />
      );
    }
    if (iconSource === LauncherIconSource.BUILTIN && iconType) {
      const iconItem = IconsList.find((item) => item.name === iconType);
      if (iconItem) {
        const Icon = iconItem.ICON;
        return <Icon size={size} className={cn('flex-shrink-0 text-sdk-foreground', className)} />;
      }
    }
    return null;
  },
);

BlockIcon.displayName = 'BlockIcon';

// ============================================================================
// Block — RICH_TEXT
// ============================================================================

interface ResourceCenterRichTextBlockViewProps {
  block: ResourceCenterRichTextBlock;
  userAttributes?: UserTourTypes.Attributes;
  onContentClick?: (element: any) => Promise<void>;
  onBlockClick?: (blockId: string) => Promise<void>;
  editSlot?: React.ReactNode;
}

export const ResourceCenterRichTextBlockView = memo(
  ({
    block,
    userAttributes,
    onContentClick,
    onBlockClick,
    editSlot,
  }: ResourceCenterRichTextBlockViewProps) => {
    if (editSlot) {
      return <>{editSlot}</>;
    }

    const handleContentClick = async (element: any) => {
      onContentClick?.(element);
      onBlockClick?.(block.id);
    };

    return (
      <ContentEditorSerialize
        contents={block.content}
        onClick={handleContentClick}
        userAttributes={userAttributes}
      />
    );
  },
);

ResourceCenterRichTextBlockView.displayName = 'ResourceCenterRichTextBlockView';

// ============================================================================
// Block — DIVIDER
// ============================================================================

interface ResourceCenterDividerBlockViewProps {
  block: ResourceCenterDividerBlock;
}

export const ResourceCenterDividerBlockView = memo(
  ({ block }: ResourceCenterDividerBlockViewProps) => {
    return <div data-block-id={block.id} className="h-px overflow-hidden bg-sdk-foreground/10" />;
  },
);

ResourceCenterDividerBlockView.displayName = 'ResourceCenterDividerBlockView';

// ============================================================================
// Block — ACTION
// ============================================================================

interface ResourceCenterActionBlockViewProps {
  block: ResourceCenterActionBlock;
  onActionBlockClick?: (blockId: string) => Promise<void>;
}

export const ResourceCenterActionBlockView = memo(
  ({ block, onActionBlockClick }: ResourceCenterActionBlockViewProps) => {
    const { userAttributes } = useResourceCenterContext();
    const handleClick = async () => {
      onActionBlockClick?.(block.id);
    };

    return (
      <button
        type="button"
        data-block-id={block.id}
        className="group/block relative flex w-full items-center gap-3 rounded-lg border border-sdk-foreground/[8%] bg-sdk-background py-4 px-3 text-left text-sm shadow-sm shadow-sdk-foreground/5 cursor-pointer overflow-hidden"
        onClick={handleClick}
      >
        <div className="absolute inset-0 bg-sdk-foreground/[5%] opacity-0 group-hover/block:opacity-100 transition-opacity" />
        <BlockIcon
          iconSource={block.iconSource}
          iconType={block.iconType}
          iconUrl={block.iconUrl}
          className="relative"
        />
        <span className="relative min-w-0 flex-1 truncate text-sdk-foreground">
          {serializeBlockName(block.name, userAttributes) || 'Untitled action'}
        </span>
      </button>
    );
  },
);

ResourceCenterActionBlockView.displayName = 'ResourceCenterActionBlockView';

// ============================================================================
// Block — LIVE_CHAT
// ============================================================================

interface ResourceCenterLiveChatBlockViewProps {
  block: ResourceCenterLiveChatBlock;
  onLiveChatClick?: (block: ResourceCenterLiveChatBlock) => void;
}

export const ResourceCenterLiveChatBlockView = memo(
  ({ block, onLiveChatClick }: ResourceCenterLiveChatBlockViewProps) => {
    const { userAttributes } = useResourceCenterContext();
    const handleClick = () => {
      onLiveChatClick?.(block);
    };

    return (
      <button
        type="button"
        data-block-id={block.id}
        className="group/block relative flex w-full items-center gap-3 rounded-lg border border-sdk-foreground/[8%] bg-sdk-background py-4 px-3 text-left text-sm shadow-sm shadow-sdk-foreground/5 cursor-pointer overflow-hidden"
        onClick={handleClick}
      >
        <div className="absolute inset-0 bg-sdk-foreground/[5%] opacity-0 group-hover/block:opacity-100 transition-opacity" />
        <span className="relative min-w-0 flex-1 truncate text-sdk-foreground">
          {serializeBlockName(block.name, userAttributes) || 'Live chat'}
        </span>
        <BlockIcon
          iconSource={block.iconSource}
          iconType={block.iconType}
          iconUrl={block.iconUrl}
          className="relative text-sdk-foreground/40"
        />
      </button>
    );
  },
);

ResourceCenterLiveChatBlockView.displayName = 'ResourceCenterLiveChatBlockView';

// ============================================================================
// NavigableBlockRow — unified row for sub-page, content-list
// ============================================================================

interface NavigableBlockRowProps {
  block: ResourceCenterNavigableBlock;
  onNavigate: (entry: ResourceCenterPageEntry) => void;
}

export const NavigableBlockRow = memo(({ block, onNavigate }: NavigableBlockRowProps) => {
  const { userAttributes, onBlockClick } = useResourceCenterContext();
  const handleClick = () => {
    onBlockClick?.(block.id);
    onNavigate({ type: block.type, block } as ResourceCenterPageEntry);
  };

  const nameText = serializeBlockName(block.name, userAttributes);
  const fallbackLabels: Partial<Record<ResourceCenterBlockType, string>> = {
    [ResourceCenterBlockType.SUB_PAGE]: 'Untitled sub-page',
    [ResourceCenterBlockType.CONTENT_LIST]: 'Content list',
  };
  const label = nameText || fallbackLabels[block.type] || block.type;

  return (
    <button
      type="button"
      data-block-id={block.id}
      className="group/block relative flex w-full items-center gap-3 rounded-lg border border-sdk-foreground/[8%] bg-sdk-background py-4 px-3 text-left text-sm shadow-sm shadow-sdk-foreground/5 cursor-pointer overflow-hidden"
      onClick={handleClick}
    >
      <div className="absolute inset-0 bg-sdk-foreground/[5%] opacity-0 group-hover/block:opacity-100 transition-opacity" />
      <BlockIcon
        iconSource={block.iconSource}
        iconType={block.iconType}
        iconUrl={block.iconUrl}
        className="relative"
      />
      <span className="relative min-w-0 flex-1 truncate text-sdk-foreground">{label}</span>
      <RiArrowRightSLine size={16} className="relative flex-shrink-0 text-sdk-foreground/40" />
    </button>
  );
});

NavigableBlockRow.displayName = 'NavigableBlockRow';

// ============================================================================
// Sub-page detail view
// ============================================================================

interface SubPageDetailProps {
  block: ResourceCenterSubPageBlock;
  editSlot?: React.ReactNode;
}

export const SubPageDetail = memo(({ block, editSlot }: SubPageDetailProps) => {
  const { userAttributes, onContentClick, onBlockClick } = useResourceCenterContext();

  if (editSlot) {
    return <>{editSlot}</>;
  }

  const handleContentClick = async (element: any) => {
    onContentClick?.(element);
    onBlockClick?.(block.id);
  };

  return (
    <ContentEditorSerialize
      contents={block.content}
      onClick={handleContentClick}
      userAttributes={userAttributes}
    />
  );
});

SubPageDetail.displayName = 'SubPageDetail';

// ============================================================================
// Content List detail view
// ============================================================================

interface ContentListDetailProps {
  block: ResourceCenterContentListBlock;
}

/** Resolve the icon for a content list item: per-item custom > block default by type */
const ContentListItemIcon = memo(
  ({
    item,
    block,
  }: {
    item: ContentListDisplayItem;
    block: ResourceCenterContentListBlock;
  }) => {
    const source = item.iconSource as LauncherIconSource | undefined;

    // INHERIT, undefined, or missing → use block-level default by content type
    if (!source || source === LauncherIconSource.INHERIT) {
      if (item.contentType === 'flow') {
        return (
          <BlockIcon
            iconSource={block.flowIconSource}
            iconType={block.flowIconType}
            iconUrl={block.flowIconUrl}
            size={20}
          />
        );
      }
      return (
        <BlockIcon
          iconSource={block.checklistIconSource}
          iconType={block.checklistIconType}
          iconUrl={block.checklistIconUrl}
          size={20}
        />
      );
    }

    // NONE → no icon
    if (source === LauncherIconSource.NONE) {
      return null;
    }

    // Custom icon (BUILTIN / UPLOAD / URL)
    return (
      <BlockIcon
        iconSource={source}
        iconType={item.iconType ?? ''}
        iconUrl={item.iconUrl}
        size={20}
      />
    );
  },
);

ContentListItemIcon.displayName = 'ContentListItemIcon';

export const ContentListDetail = memo(({ block }: ContentListDetailProps) => {
  const { contentListItems, onContentListItemClick, searchQuery } = useResourceCenterContext();

  const filteredItems = useMemo(() => {
    if (!block.showSearchField || !searchQuery.trim()) return contentListItems;
    const query = searchQuery.trim().toLowerCase();
    return contentListItems.filter((item) => item.name.toLowerCase().includes(query));
  }, [contentListItems, searchQuery, block.showSearchField]);

  return (
    <div className="flex flex-col gap-3">
      {filteredItems.length === 0 && (
        <div className="py-4 text-center text-sm text-sdk-foreground/50">
          {searchQuery.trim() ? 'No results found' : 'No items'}
        </div>
      )}

      {filteredItems.length > 0 && (
        <div className="flex flex-col">
          {filteredItems.map((item) => (
            <button
              key={item.contentId}
              type="button"
              className="flex w-full items-center gap-3 rounded-md p-2 text-left text-sm transition-colors hover:bg-sdk-hover cursor-pointer"
              onClick={() => onContentListItemClick?.(item)}
            >
              <ContentListItemIcon item={item} block={block} />
              <span className="min-w-0 flex-1 truncate text-sdk-foreground">{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

ContentListDetail.displayName = 'ContentListDetail';

// ============================================================================
// DetailView — switch on page type
// ============================================================================

interface DetailViewProps {
  page: ResourceCenterPageEntry;
  subPageEditSlot?: React.ReactNode;
}

export const DetailView = memo(({ page, subPageEditSlot }: DetailViewProps) => {
  switch (page.type) {
    case ResourceCenterBlockType.SUB_PAGE:
      return <SubPageDetail block={page.block} editSlot={subPageEditSlot} />;
    case ResourceCenterBlockType.CONTENT_LIST:
      return <ContentListDetail block={page.block} />;
    default:
      return null;
  }
});

DetailView.displayName = 'DetailView';

// ============================================================================
// Body
// ============================================================================

/**
 * Compute inline style for the header background layer based on theme settings.
 * 'Auto' means use the existing CSS variable (no inline override).
 */
function getHeaderBackgroundStyle(
  headerBackground:
    | { type: string; color: string; gradientFrom: string; gradientTo: string; imageUrl: string }
    | undefined,
): CSSProperties | undefined {
  if (!headerBackground) return undefined;

  const resolveColor = (value: string): string | undefined =>
    value === 'Auto' ? undefined : value;

  switch (headerBackground.type) {
    case 'color': {
      const color = resolveColor(headerBackground.color);
      return color ? { backgroundColor: color } : undefined;
    }
    case 'gradient': {
      const from =
        resolveColor(headerBackground.gradientFrom) ??
        'hsl(var(--usertour-brand-background-color))';
      const to = resolveColor(headerBackground.gradientTo) ?? 'var(--sdk-background)';
      return { background: `linear-gradient(to bottom, ${from}, ${to})` };
    }
    case 'image': {
      const url = headerBackground.imageUrl;
      if (!url) return undefined;
      return {
        backgroundImage: `url(${url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    default:
      return undefined;
  }
}

export const ResourceCenterBody = memo(({ children }: { children: React.ReactNode }) => {
  const { showBackButton, nav, data, themeSetting } = useResourceCenterContext();
  const isHomePage = !showBackButton && nav.activeTabId === (data.tabs[0]?.id ?? '');

  const headerBackgroundStyle = useMemo(
    () => getHeaderBackgroundStyle(themeSetting.resourceCenter?.headerBackground),
    [themeSetting.resourceCenter?.headerBackground],
  );

  const logoUrl = themeSetting.resourceCenter?.logoUrl;
  const headerBackgroundType = themeSetting.resourceCenter?.headerBackground?.type;
  const isHeaderNone = headerBackgroundType === 'none';

  return (
    <div
      className={cn(
        'relative order-2 min-h-0 min-w-0 flex-1 bg-sdk-background',
        'group-data-[animate-frame=true]:transition-opacity',
        'group-data-[animate-frame=true]:duration-sdk-resource-center',
        'group-data-[state=closed]:absolute group-data-[state=closed]:invisible group-data-[state=closed]:opacity-0',
        'group-data-[animating]:pointer-events-none group-data-[animating]:overflow-hidden',
      )}
    >
      {/* Close button: absolute in outer container, does not scroll (hidden when 'none' — header handles it) */}
      {isHomePage && !isHeaderNone && (
        <div className="absolute top-2 right-2 z-30">
          <ResourceCenterCloseButton />
        </div>
      )}
      {/* Scrollable inner container */}
      <div className="relative h-full overflow-y-auto overflow-x-hidden">
        {/* Background layer: absolute, overflows slightly to avoid edge gaps */}
        {isHomePage && !isHeaderNone && (
          <div className="overflow-hidden absolute -inset-x-3 -top-3 pointer-events-none">
            <div className="overflow-hidden relative w-full bg-gradient-to-b from-transparent h-[520px] to-sdk-background">
              <div
                className={cn(
                  'w-full h-full',
                  !headerBackgroundStyle && 'bg-sdk-brand-background/90',
                )}
                style={headerBackgroundStyle}
              />
              <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-sdk-background" />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-sdk-background" />
            </div>
          </div>
        )}
        {/* Content: logo + children, scrolls together */}
        <div className={cn('relative z-20 px-4 pb-4 flex flex-col gap-2.5', !isHomePage && 'pt-4')}>
          {isHomePage && !isHeaderNone && (
            <div className="mt-2 pl-2 flex items-center h-sdk-resource-center-header-button">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-7 w-7 object-cover rounded-full opacity-80"
                />
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
});

ResourceCenterBody.displayName = 'ResourceCenterBody';

// ============================================================================
// Blocks — renders current tab's blocks or detail view
// ============================================================================

interface ResourceCenterBlocksProps {
  messageEditSlots?: Record<string, React.ReactNode>;
  subPageEditSlot?: React.ReactNode;
}

export const ResourceCenterBlocks = memo(
  ({ messageEditSlots, subPageEditSlot }: ResourceCenterBlocksProps) => {
    const {
      currentTab,
      currentPage,
      autoExpandedPage,
      userAttributes,
      onContentClick,
      onBlockClick,
      onLiveChatClick,
      actions,
    } = useResourceCenterContext();

    // If a detail page is pushed, render it
    if (currentPage) {
      return <DetailView page={currentPage} subPageEditSlot={subPageEditSlot} />;
    }

    // Auto-expanded tab: render detail view directly (tab bar stays, no back button)
    if (autoExpandedPage) {
      return <DetailView page={autoExpandedPage} subPageEditSlot={subPageEditSlot} />;
    }

    const blocks = currentTab?.blocks ?? [];

    return (
      <>
        {blocks.map((block) => {
          return (
            <Fragment key={block.id}>
              {block.type === ResourceCenterBlockType.RICH_TEXT && (
                <ResourceCenterRichTextBlockView
                  block={block}
                  userAttributes={userAttributes}
                  onContentClick={onContentClick}
                  onBlockClick={onBlockClick}
                  editSlot={messageEditSlots?.[block.id]}
                />
              )}
              {block.type === ResourceCenterBlockType.DIVIDER && (
                <ResourceCenterDividerBlockView block={block} />
              )}
              {block.type === ResourceCenterBlockType.ACTION && (
                <ResourceCenterActionBlockView block={block} onActionBlockClick={onBlockClick} />
              )}
              {block.type === ResourceCenterBlockType.LIVE_CHAT && (
                <ResourceCenterLiveChatBlockView block={block} onLiveChatClick={onLiveChatClick} />
              )}
              {(block.type === ResourceCenterBlockType.SUB_PAGE ||
                block.type === ResourceCenterBlockType.CONTENT_LIST) && (
                <NavigableBlockRow
                  block={block as ResourceCenterNavigableBlock}
                  onNavigate={actions.push}
                />
              )}
            </Fragment>
          );
        })}

        {blocks.length === 0 && (
          <div className="py-8 text-center text-sm opacity-40">No blocks added yet</div>
        )}
      </>
    );
  },
);

ResourceCenterBlocks.displayName = 'ResourceCenterBlocks';
