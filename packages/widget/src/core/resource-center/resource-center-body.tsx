import {
  CSSProperties,
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ResourceCenterActionBlock,
  ResourceCenterAnnouncementBlock,
  ResourceCenterContentListBlock,
  ResourceCenterDividerBlock,
  ResourceCenterLiveChatBlock,
  ResourceCenterRichTextBlock,
  ResourceCenterNavigableBlock,
  ResourceCenterPageEntry,
  ResourceCenterPageRef,
  ResourceCenterSubPageBlock,
  AnnouncementListItem,
  AnnouncementDetail as AnnouncementDetailType,
  UserTourTypes,
} from '@usertour/types';
import { LauncherIconSource, ResourceCenterBlockType } from '@usertour/types';
import { cn } from '@usertour/tailwind';
import { RiArrowRightSLine } from '@usertour/icons';
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
  onNavigate: (ref: ResourceCenterPageRef) => void;
}

export const NavigableBlockRow = memo(({ block, onNavigate }: NavigableBlockRowProps) => {
  const { userAttributes, onBlockClick } = useResourceCenterContext();
  const handleClick = () => {
    onBlockClick?.(block.id);
    onNavigate({ type: block.type, blockId: block.id });
  };

  const nameText = serializeBlockName(block.name, userAttributes);
  const fallbackLabels: Partial<Record<ResourceCenterBlockType, string>> = {
    [ResourceCenterBlockType.SUB_PAGE]: 'Untitled sub-page',
    [ResourceCenterBlockType.CONTENT_LIST]: 'Content list',
    [ResourceCenterBlockType.ANNOUNCEMENT]: 'Announcements',
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
// Announcement — list view
// ============================================================================

/**
 * Format a date string into a human-readable label like "Tuesday, Apr 14".
 */
const formatAnnouncementDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Group announcements by date label and return groups in order.
 */
const groupAnnouncementsByDate = (items: AnnouncementListItem[]) => {
  const groups: { label: string; items: AnnouncementListItem[] }[] = [];
  // null sentinel, not '': an item with an empty time (label '') still starts a
  // group instead of pushing into groups[-1]. A null-scheduledAt row can sort
  // first (server allows it and Postgres orders NULLS FIRST desc), and its time
  // is '' — without this the first push would read undefined and crash the feed.
  let currentLabel: string | null = null;
  for (const item of items) {
    const label = item.time ? formatAnnouncementDate(item.time) : '';
    if (groups.length === 0 || label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, items: [] });
    }
    groups[groups.length - 1].items.push(item);
  }
  return groups;
};

interface AnnouncementListDetailProps {
  block: ResourceCenterAnnouncementBlock;
}

export const AnnouncementListDetail = memo(({ block }: AnnouncementListDetailProps) => {
  const { onListAnnouncements, onMarkAnnouncementSeen, onContentClick, actions, userAttributes } =
    useResourceCenterContext();
  const [announcements, setAnnouncements] = useState<AnnouncementListItem[]>([]);
  const [feedAttributes, setFeedAttributes] = useState<Record<string, any> | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // The announcement content isn't part of the RC session, so its referenced
  // attributes aren't in the session's userAttributes; the feed returns their
  // resolved values, which we merge here so intro attributes interpolate instead
  // of showing their fallback.
  const mergedAttributes = useMemo(
    () => ({ ...userAttributes, ...feedAttributes }),
    [userAttributes, feedAttributes],
  );

  // The SDK passes fresh inline callbacks on every render, and marking seen
  // optimistically updates the store (to drop the badge), which re-renders the
  // provider and churns those callback identities. Depending on the callbacks
  // here would re-run this load on that churn — refetching the feed and
  // re-firing marks that race the still-in-flight ones. So read them from refs
  // and run the load exactly once per open.
  const onListAnnouncementsRef = useRef(onListAnnouncements);
  onListAnnouncementsRef.current = onListAnnouncements;
  const onMarkAnnouncementSeenRef = useRef(onMarkAnnouncementSeen);
  onMarkAnnouncementSeenRef.current = onMarkAnnouncementSeen;

  // Single load — the feed is capped server-side (newest N), so there is no
  // pagination to drive.
  useEffect(() => {
    const listAnnouncements = onListAnnouncementsRef.current;
    // No provider (e.g. the builder preview embed passes no announcement
    // handlers): clear the initial loading state so we fall through to the
    // empty placeholder instead of hanging on "Loading..." forever.
    if (!listAnnouncements) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    listAnnouncements(null)
      .then((result) => {
        setAnnouncements(result.announcements);
        setFeedAttributes(result.attributes);
        // Displaying an announcement in the opened feed is what marks it seen,
        // independent of whether Read more is enabled. Every announcement passes
        // through here before any detail view, so this is the only seen marker.
        // Local seen is left untouched on purpose: the unseen dot stays for the
        // rest of this session and clears on the next open, when the server
        // reports it seen.
        for (const item of result.announcements) {
          if (!item.seen) {
            onMarkAnnouncementSeenRef.current?.(item.id, item.versionId);
          }
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Click "Read more" — push detail page onto the stack. Seen is marked on feed
  // load, not here, so this only navigates.
  const handleReadMore = useCallback(
    (item: AnnouncementListItem) => {
      actions.push({
        type: 'announcement_detail',
        blockId: block.id,
        announcementId: item.id,
      });
    },
    [actions, block.id],
  );

  const dateGroups = useMemo(() => groupAnnouncementsByDate(announcements), [announcements]);

  return (
    <div className="flex flex-col p-4">
      {isLoading && (
        <div className="py-4 text-center text-sm text-sdk-foreground/50">Loading...</div>
      )}

      {!isLoading && announcements.length === 0 && (
        <div className="py-4 text-center text-sm text-sdk-foreground/50">No announcements yet</div>
      )}

      {!isLoading &&
        dateGroups.map((group) => (
          <div key={group.label}>
            {/* Date separator */}
            {group.label && (
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-sdk-foreground/15" />
                <span className="text-xs text-sdk-foreground/50 whitespace-nowrap">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-sdk-foreground/15" />
              </div>
            )}

            {group.items.map((item) => (
              <div key={item.id} className="mb-4">
                {/* Title */}
                <div className="flex items-center gap-2">
                  {!item.seen && (
                    <span className="flex-shrink-0 h-2 w-2 rounded-full bg-sdk-resource-center-badge-background" />
                  )}
                  <h3 className="text-base font-bold text-sdk-foreground">{item.title}</h3>
                </div>

                {/* Intro content */}
                <div className="text-sm text-sdk-foreground mt-1">
                  <ContentEditorSerialize
                    contents={item.content as any}
                    onClick={onContentClick}
                    userAttributes={mergedAttributes}
                  />
                </div>

                {/* Read more button */}
                {item.moreEnabled && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-sm text-sdk-brand-background rounded-md px-2 py-1 hover:bg-sdk-hover active:bg-sdk-active cursor-pointer"
                      onClick={() => handleReadMore(item)}
                    >
                      {item.moreButtonText || 'Read more'}
                      <span className="text-xs">→</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
});

AnnouncementListDetail.displayName = 'AnnouncementListDetail';

// ============================================================================
// Announcement — detail view (pushed onto page stack, has Back header)
// ============================================================================

interface AnnouncementDetailViewProps {
  announcementId: string;
}

export const AnnouncementDetailView = memo(({ announcementId }: AnnouncementDetailViewProps) => {
  const { onGetAnnouncement, onContentClick, userAttributes } = useResourceCenterContext();
  const [detail, setDetail] = useState<AnnouncementDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // The SDK passes a fresh onGetAnnouncement identity every render, so depending
  // on it would re-run this fetch (flashing back to 'Loading...' + re-issuing the
  // socket request) on every widget re-render. Read it from a ref and fetch once
  // per announcementId — same reason the list view refs its callbacks.
  const onGetAnnouncementRef = useRef(onGetAnnouncement);
  onGetAnnouncementRef.current = onGetAnnouncement;

  // Seen is marked on feed load (the list every announcement passes through), so
  // the detail view only fetches and displays.
  useEffect(() => {
    const getAnnouncement = onGetAnnouncementRef.current;
    if (!getAnnouncement) return;
    setIsLoading(true);
    getAnnouncement(announcementId)
      .then(setDetail)
      .finally(() => setIsLoading(false));
  }, [announcementId]);

  // Merge the announcement's own resolved attributes (its content isn't part of
  // the RC session, so they aren't in the session's userAttributes) so intro /
  // detail attributes interpolate instead of showing their fallback.
  const mergedAttributes = useMemo(
    () => ({ ...userAttributes, ...detail?.attributes }),
    [userAttributes, detail?.attributes],
  );

  if (isLoading) {
    return <div className="py-4 text-center text-sm text-sdk-foreground/50">Loading...</div>;
  }

  if (!detail) return null;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div>
        <h3 className="text-base font-bold text-sdk-foreground">{detail.title}</h3>
        {detail.time && (
          <div className="text-xs text-sdk-foreground/50 mt-1">
            {formatAnnouncementDate(detail.time)}
          </div>
        )}
      </div>

      <div className="text-sm text-sdk-foreground">
        <ContentEditorSerialize
          contents={detail.content as any}
          onClick={onContentClick}
          userAttributes={mergedAttributes}
        />
      </div>

      {detail.moreContent && (
        <div className="text-sm text-sdk-foreground">
          <ContentEditorSerialize
            contents={detail.moreContent as any}
            onClick={onContentClick}
            userAttributes={mergedAttributes}
          />
        </div>
      )}
    </div>
  );
});

AnnouncementDetailView.displayName = 'AnnouncementDetailView';

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
    case ResourceCenterBlockType.ANNOUNCEMENT:
      return <AnnouncementListDetail block={page.block} />;
    case 'announcement_detail':
      return <AnnouncementDetailView announcementId={page.announcementId} />;
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
      // The color (incl. 'Auto') is plumbed through the
      // --usertour-resource-center-header-background-color CSS variable,
      // applied via the bg-sdk-resource-center-header Tailwind class. No
      // inline style needed here.
      return undefined;
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
                  // type='color' (incl. 'Auto') routes through the
                  // bg-sdk-resource-center-header CSS-var-backed class.
                  // gradient / image set inline `style` and skip the class.
                  !headerBackgroundStyle && 'bg-sdk-resource-center-header',
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
                block.type === ResourceCenterBlockType.CONTENT_LIST ||
                block.type === ResourceCenterBlockType.ANNOUNCEMENT) && (
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
