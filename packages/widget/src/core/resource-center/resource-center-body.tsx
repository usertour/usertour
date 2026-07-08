import {
  CSSProperties,
  Fragment,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
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
import { Button } from '../../primitives';
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
  /** Unread count badge shown next to the name (announcement block rows). */
  badge?: number;
}

export const NavigableBlockRow = memo(({ block, onNavigate, badge }: NavigableBlockRowProps) => {
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
      {/* Unread badge replaces the icon while there is something new (the
          reference pattern); the icon returns once everything is read. */}
      {badge != null && badge > 0 ? (
        <span className="relative flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-sdk-resource-center-badge-background text-xs font-bold text-sdk-resource-center-badge-foreground">
          {badge}
        </span>
      ) : (
        <BlockIcon
          iconSource={block.iconSource}
          iconType={block.iconType}
          iconUrl={block.iconUrl}
          className="relative"
        />
      )}
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

// ============================================================================
// LoadErrorRetry — shared failure state for on-demand reads
// ============================================================================

interface LoadErrorRetryProps {
  onRetry: () => void;
  message?: string;
}

/**
 * Shared load-failure state for the on-demand reads (content list, announcement
 * feed / detail): an explicit "couldn't load" line plus a Retry button, so a
 * timed-out fetch never renders as a misleading empty state.
 */
const LoadErrorRetry = memo(({ onRetry, message = "Couldn't load." }: LoadErrorRetryProps) => (
  <div className="py-4 flex flex-col items-center gap-2 text-sm text-sdk-foreground/50">
    <span>{message}</span>
    <button
      type="button"
      className="text-sm text-sdk-brand-background rounded-md px-2 py-1 hover:bg-sdk-hover cursor-pointer"
      onClick={onRetry}
    >
      Retry
    </button>
  </div>
));

LoadErrorRetry.displayName = 'LoadErrorRetry';

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
  const {
    contentListItems,
    contentListLoading,
    contentListError,
    onContentListNavigate,
    onContentListItemClick,
    searchQuery,
  } = useResourceCenterContext();

  const filteredItems = useMemo(() => {
    if (!block.showSearchField || !searchQuery.trim()) return contentListItems;
    const query = searchQuery.trim().toLowerCase();
    return contentListItems.filter((item) => item.name.toLowerCase().includes(query));
  }, [contentListItems, searchQuery, block.showSearchField]);

  return (
    <div className="flex flex-col gap-3">
      {contentListLoading && (
        <div className="py-4 text-center text-sm text-sdk-foreground/50">Loading...</div>
      )}

      {!contentListLoading && contentListError && (
        <LoadErrorRetry onRetry={() => onContentListNavigate?.(block)} />
      )}

      {!contentListLoading && !contentListError && filteredItems.length === 0 && (
        <div className="py-4 text-center text-sm text-sdk-foreground/50">
          {searchQuery.trim() ? 'No results found' : 'No items'}
        </div>
      )}

      {!contentListLoading && !contentListError && filteredItems.length > 0 && (
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
 * The announcement Read more button — brand-colored text in a pill that gains
 * the theme hover/active background. Shared by the feed rows and the popup
 * bubble so the two surfaces can't drift.
 */
export interface AnnouncementReadMoreButtonProps {
  label?: string;
  onClick: () => void;
}

export const AnnouncementReadMoreButton = (props: AnnouncementReadMoreButtonProps) => {
  const { label, onClick } = props;
  return (
    <Button
      variant="custom"
      className="inline-flex items-center gap-1 text-sm text-sdk-brand-background rounded-md px-2 py-1 hover:bg-sdk-hover active:bg-sdk-active cursor-pointer"
      onClick={onClick}
    >
      {label || 'Read more'}
      <span className="text-xs" aria-hidden="true">
        →
      </span>
    </Button>
  );
};

/**
 * Format a date string into a human-readable label like "Tuesday, Apr 14".
 * The year is shown only for dates outside the current year, so recent
 * announcements read light ("Friday, Jul 3") while an old one can't be
 * mistaken for this year's date. Shared by the feed separators, the detail
 * header, and the popup bubble.
 */
export const formatAnnouncementDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const isCurrentYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    ...(isCurrentYear ? {} : { year: 'numeric' }),
  });
};

interface AnnouncementListDetailProps {
  block: ResourceCenterAnnouncementBlock;
}

export const AnnouncementListDetail = memo(({ block }: AnnouncementListDetailProps) => {
  const {
    isOpen,
    onListAnnouncements,
    onMarkAnnouncementsSeen,
    onContentClick,
    actions,
    userAttributes,
    announcementFeedCache,
    bodyScrollRef,
  } = useResourceCenterContext();
  // Navigating into a detail page unmounts this list; the session cache (see
  // AnnouncementFeedCache) lets Back restore the already-loaded feed instead
  // of refetching and re-running the seen side effects.
  const cachedFeed = announcementFeedCache.current;
  const [announcements, setAnnouncements] = useState<AnnouncementListItem[]>(
    () => cachedFeed?.announcements ?? [],
  );
  const [feedAttributes, setFeedAttributes] = useState<Record<string, any> | undefined>(
    () => cachedFeed?.attributes,
  );
  const [isLoading, setIsLoading] = useState(!cachedFeed);
  // Feed load failed (timeout / dropped socket). Distinct from an empty feed so
  // we show a retry instead of "No announcements yet". reloadKey re-runs the
  // load effect on retry (the cache is left unset on error, so it refetches).
  const [feedError, setFeedError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // The announcement content isn't part of the RC session, so its referenced
  // attributes aren't in the session's userAttributes; the feed returns their
  // resolved values, which we merge here so intro attributes interpolate instead
  // of showing their fallback.
  const mergedAttributes = useMemo(
    () => ({ ...userAttributes, ...feedAttributes }),
    [userAttributes, feedAttributes],
  );

  // These callbacks are public-API props — the widget must not assume stable
  // identities (our own SDK passes stable arrow-properties today, but any
  // consumer can pass fresh inline arrows every render). Depending on them
  // here would re-run this load on identity churn — refetching the feed and
  // re-firing marks that race the still-in-flight ones. So read them from refs
  // and run the load exactly once per open.
  const onListAnnouncementsRef = useRef(onListAnnouncements);
  onListAnnouncementsRef.current = onListAnnouncements;
  const onMarkAnnouncementsSeenRef = useRef(onMarkAnnouncementsSeen);
  onMarkAnnouncementsSeenRef.current = onMarkAnnouncementsSeen;

  // Load + mark-seen only when the feed is actually VISIBLE to the user, i.e.
  // the panel is open. The panel collapses via CSS (this component stays
  // mounted) and nav is persisted across reloads, so a hidden mount — e.g.
  // restored nav sitting on the Announcements page while the panel is collapsed
  // — must NOT fetch or silently mark everything (including a pending POPUP)
  // seen. Depending on isOpen also re-runs on reopen: the cache is cleared on
  // collapse, so reopening after a new announcement was published refetches and
  // clears the badge instead of showing stale data.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    // Same-open-session revisit (Back from a detail page): the cache still holds
    // the loaded feed. The useState initializers already hydrated from this same
    // cache on (re)mount, so there's nothing to re-set — just skip the refetch
    // and the mark-seen (which would double-decrement the optimistic badge).
    if (announcementFeedCache.current) {
      return;
    }
    const listAnnouncements = onListAnnouncementsRef.current;
    // No provider (e.g. the builder preview embed passes no announcement
    // handlers): clear the initial loading state so we fall through to the
    // empty placeholder instead of hanging on "Loading..." forever.
    if (!listAnnouncements) {
      setIsLoading(false);
      return;
    }
    // The request is bounded by the SDK's 30s emit timeout; if the user closes
    // the feed before it resolves, skip the state updates and — critically — the
    // mark-seen side-effect, so we don't mark (and badge-decrement / count views
    // for) announcements the user never actually saw.
    let cancelled = false;
    setIsLoading(true);
    setFeedError(false);
    listAnnouncements()
      .then((result) => {
        if (cancelled) {
          return;
        }
        // null = load failed (timeout / dropped socket). Show a retry instead of
        // an empty feed, and don't cache — so retry / reopen refetches.
        if (result === null) {
          setFeedError(true);
          return;
        }
        setAnnouncements(result.announcements);
        setFeedAttributes(result.attributes);
        announcementFeedCache.current = {
          announcements: result.announcements,
          attributes: result.attributes,
          scrollTop: 0,
        };
        // Displaying an announcement in the opened feed is what marks it seen,
        // independent of whether Read more is enabled. Every announcement passes
        // through here before any detail view, so this is the only seen marker —
        // one batch covering exactly the items the feed shows as unseen.
        // Local seen is left untouched on purpose: the unseen dot stays for the
        // rest of this session and clears on the next open, when the server
        // reports it seen.
        const unseenItems = result.announcements
          .filter((item) => !item.seen)
          .map((item) => ({ contentId: item.id }));
        if (unseenItems.length > 0) {
          onMarkAnnouncementsSeenRef.current?.(unseenItems);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, announcementFeedCache, reloadKey]);

  // Retry a failed feed load: the cache is unset on error, so bumping reloadKey
  // re-runs the load effect and refetches.
  const retryFeed = useCallback(() => {
    setFeedError(false);
    setReloadKey((key) => key + 1);
  }, []);

  // Restore the scroll position saved when the list last unmounted (Back from
  // a detail page), and save it back on unmount. Layout effects: restore must
  // land before paint, and save must read the container before React detaches
  // the page.
  useLayoutEffect(() => {
    const scrollContainer = bodyScrollRef.current;
    if (!scrollContainer) {
      return;
    }
    // Restore the saved position, including 0: after visiting a detail page the
    // shared scroll container is left wherever the detail was, so a list that was
    // at the top (saved 0) must be forced back to 0 on Back — a `> 0` guard would
    // skip that and leave the feed stuck at the detail's scroll offset.
    const cached = announcementFeedCache.current;
    if (cached) {
      scrollContainer.scrollTop = cached.scrollTop;
    }
    return () => {
      if (announcementFeedCache.current) {
        announcementFeedCache.current.scrollTop = scrollContainer.scrollTop;
      }
    };
  }, [announcementFeedCache, bodyScrollRef]);

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

  return (
    <div className="flex flex-col p-4">
      {isLoading && (
        <div className="py-4 text-center text-sm text-sdk-foreground/50">Loading...</div>
      )}

      {!isLoading && feedError && (
        <LoadErrorRetry message="Couldn't load announcements." onRetry={retryFeed} />
      )}

      {!isLoading && !feedError && announcements.length === 0 && (
        <div className="py-4 text-center text-sm text-sdk-foreground/50">No announcements yet</div>
      )}

      {!isLoading &&
        !feedError &&
        announcements.map((item) => (
          <div key={item.id} className="mb-4">
            {/* Every announcement opens with its own captioned date separator
                (no day grouping): the intro is free-form rich text, so a bold
                title plus spacing isn't a reliable boundary between items — a
                uniform separator is, and it keeps each item's date in view at
                any scroll position. Same-day repetition reads as rhythm, not
                noise. An item with no time (defensive: publish always stamps
                scheduledAt) still gets a plain divider line. */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-sdk-foreground/15" />
              {item.time && (
                <span className="text-xs text-sdk-foreground/50 whitespace-nowrap">
                  {formatAnnouncementDate(item.time)}
                </span>
              )}
              <div className="flex-1 h-px bg-sdk-foreground/15" />
            </div>

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
                contents={item.content}
                onClick={onContentClick}
                userAttributes={mergedAttributes}
              />
            </div>

            {/* Read more button */}
            {item.moreEnabled && (
              <div className="flex justify-end mt-2">
                <AnnouncementReadMoreButton
                  label={item.moreButtonText}
                  onClick={() => handleReadMore(item)}
                />
              </div>
            )}
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
  const { onGetAnnouncement, onContentClick, userAttributes, bodyScrollRef } =
    useResourceCenterContext();
  const [detail, setDetail] = useState<AnnouncementDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Re-runs the fetch on retry. getAnnouncement returns null on failure; since
  // the detail is reached from an existing feed item, a null is treated as a
  // retryable error rather than a silent blank.
  const [reloadKey, setReloadKey] = useState(0);

  // List and detail share the body's scroll container. The list saves/restores
  // its scroll position (for Back), so without this the detail page would open
  // inheriting the list's scrollTop — mid-page for a long feed. Reset to top on
  // entry, before paint.
  useLayoutEffect(() => {
    if (bodyScrollRef.current) {
      bodyScrollRef.current.scrollTop = 0;
    }
  }, [bodyScrollRef]);

  // onGetAnnouncement is a public-API prop with no stability guarantee (a
  // consumer may pass a fresh inline arrow every render); depending on it would
  // re-run this fetch (flashing back to 'Loading...' + re-issuing the socket
  // request) on every widget re-render. Read it from a ref and fetch once per
  // announcementId — same reason the list view refs its callbacks.
  const onGetAnnouncementRef = useRef(onGetAnnouncement);
  onGetAnnouncementRef.current = onGetAnnouncement;

  // Seen is marked on feed load (the list every announcement passes through), so
  // the detail view only fetches and displays.
  useEffect(() => {
    const getAnnouncement = onGetAnnouncementRef.current;
    // No provider wired the handler: clear loading so we fall through to an empty
    // state instead of hanging on 'Loading...' (mirrors the list view).
    if (!getAnnouncement) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getAnnouncement(announcementId)
      .then(setDetail)
      .finally(() => setIsLoading(false));
  }, [announcementId, reloadKey]);

  const retryDetail = useCallback(() => setReloadKey((key) => key + 1), []);

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

  if (!detail) {
    return <LoadErrorRetry onRetry={retryDetail} />;
  }

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
          contents={detail.content}
          onClick={onContentClick}
          userAttributes={mergedAttributes}
        />
      </div>

      {detail.moreContent && (
        <div className="text-sm text-sdk-foreground">
          <ContentEditorSerialize
            contents={detail.moreContent}
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
  const { showBackButton, nav, data, themeSetting, bodyScrollRef } = useResourceCenterContext();
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
      <div ref={bodyScrollRef} className="relative h-full overflow-y-auto overflow-x-hidden">
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
      data,
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
                  badge={
                    block.type === ResourceCenterBlockType.ANNOUNCEMENT
                      ? data.announcementUnreadCount
                      : undefined
                  }
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
