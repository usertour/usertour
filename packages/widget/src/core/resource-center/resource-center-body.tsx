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
  ResourceCenterContentListBlock,
  ResourceCenterDividerBlock,
  ResourceCenterKnowledgeBaseBlock,
  ResourceCenterMessageBlock,
  ResourceCenterNavigableBlock,
  ResourceCenterPageEntry,
  ResourceCenterSubPageBlock,
  KnowledgeBaseArticleItem as KnowledgeBaseArticle,
  UserTourTypes,
} from '@usertour/types';
import { LauncherIconSource, ResourceCenterBlockType } from '@usertour/types';
import { cn } from '@usertour-packages/tailwind';
import { RiArrowRightSLine } from '@usertour-packages/icons';
import { ContentEditorSerialize } from '../../serialize/content-editor-serialize';
import { useResourceCenterContext } from './context';
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
        return (
          <Icon
            size={size}
            className={cn('flex-shrink-0 text-sdk-resource-center-foreground', className)}
          />
        );
      }
    }
    return null;
  },
);

BlockIcon.displayName = 'BlockIcon';

// ============================================================================
// Block — MESSAGE
// ============================================================================

interface ResourceCenterMessageBlockViewProps {
  block: ResourceCenterMessageBlock;
  userAttributes?: UserTourTypes.Attributes;
  onContentClick?: (element: any) => Promise<void>;
  onBlockClick?: (blockId: string) => Promise<void>;
  editSlot?: React.ReactNode;
}

export const ResourceCenterMessageBlockView = memo(
  ({
    block,
    userAttributes,
    onContentClick,
    onBlockClick,
    editSlot,
  }: ResourceCenterMessageBlockViewProps) => {
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

ResourceCenterMessageBlockView.displayName = 'ResourceCenterMessageBlockView';

// ============================================================================
// Block — CHECKLIST (slot)
// ============================================================================

interface ResourceCenterChecklistBlockViewProps {
  slot?: React.ReactNode;
}

export const ResourceCenterChecklistBlockView = memo(
  ({ slot }: ResourceCenterChecklistBlockViewProps) => {
    if (slot) {
      return <div className="p-2">{slot}</div>;
    }

    return <></>;
  },
);

ResourceCenterChecklistBlockView.displayName = 'ResourceCenterChecklistBlockView';

// ============================================================================
// Block — DIVIDER
// ============================================================================

interface ResourceCenterDividerBlockViewProps {
  block: ResourceCenterDividerBlock;
}

export const ResourceCenterDividerBlockView = memo(
  ({ block }: ResourceCenterDividerBlockViewProps) => {
    return (
      <div
        data-block-id={block.id}
        className="h-px overflow-hidden bg-sdk-resource-center-foreground/10"
      />
    );
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
    const handleClick = async () => {
      onActionBlockClick?.(block.id);
    };

    return (
      <button
        type="button"
        data-block-id={block.id}
        className="group/block relative flex w-full items-center gap-3 rounded-lg border border-sdk-resource-center-foreground/[8%] bg-sdk-background py-4 px-3 text-left text-sm shadow-sm shadow-sdk-resource-center-foreground/5 cursor-pointer overflow-hidden"
        onClick={handleClick}
      >
        <div className="absolute inset-0 bg-sdk-resource-center-foreground/[5%] opacity-0 group-hover/block:opacity-100 transition-opacity" />
        <BlockIcon
          iconSource={block.iconSource}
          iconType={block.iconType}
          iconUrl={block.iconUrl}
          className="relative"
        />
        <span className="relative min-w-0 flex-1 truncate text-sdk-resource-center-foreground">
          {block.name || 'Untitled action'}
        </span>
      </button>
    );
  },
);

ResourceCenterActionBlockView.displayName = 'ResourceCenterActionBlockView';

// ============================================================================
// NavigableBlockRow — unified row for sub-page, knowledge-base, content-list
// ============================================================================

interface NavigableBlockRowProps {
  block: ResourceCenterNavigableBlock;
  onNavigate: (entry: ResourceCenterPageEntry) => void;
}

export const NavigableBlockRow = memo(({ block, onNavigate }: NavigableBlockRowProps) => {
  const handleClick = () => {
    onNavigate({ type: block.type, block } as ResourceCenterPageEntry);
  };

  const label =
    block.type === ResourceCenterBlockType.SUB_PAGE
      ? block.name || 'Untitled sub-page'
      : block.type === ResourceCenterBlockType.KNOWLEDGE_BASE
        ? block.name || 'Knowledge base'
        : block.name || 'Content list';

  return (
    <button
      type="button"
      data-block-id={block.id}
      className="group/block relative flex w-full items-center gap-3 rounded-lg border border-sdk-resource-center-foreground/[8%] bg-sdk-background py-4 px-3 text-left text-sm shadow-sm shadow-sdk-resource-center-foreground/5 cursor-pointer overflow-hidden"
      onClick={handleClick}
    >
      <div className="absolute inset-0 bg-sdk-resource-center-foreground/[5%] opacity-0 group-hover/block:opacity-100 transition-opacity" />
      <BlockIcon
        iconSource={block.iconSource}
        iconType={block.iconType}
        iconUrl={block.iconUrl}
        className="relative"
      />
      <span className="relative min-w-0 flex-1 truncate text-sdk-resource-center-foreground">
        {label}
      </span>
      <RiArrowRightSLine
        size={16}
        className="relative flex-shrink-0 text-sdk-resource-center-foreground/40"
      />
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
// Knowledge Base — search result article item
// ============================================================================

const KnowledgeBaseArticleRow = memo(({ article }: { article: KnowledgeBaseArticle }) => {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 rounded-md p-2 text-left text-sm transition-colors hover:bg-sdk-hover no-underline"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-5 w-5 flex-shrink-0 text-sdk-resource-center-foreground/50 mt-0.5"
      >
        <path d="M20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22ZM7 6V8H17V6H7ZM7 10V12H17V10H7ZM7 14V16H14V14H7Z" />
      </svg>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-sdk-resource-center-foreground line-clamp-2">
          {article.title}
        </div>
        {article.snippet && (
          <div className="text-xs text-sdk-resource-center-foreground/70 mt-1 line-clamp-3">
            {article.snippet}
          </div>
        )}
      </div>
    </a>
  );
});

KnowledgeBaseArticleRow.displayName = 'KnowledgeBaseArticleRow';

// ============================================================================
// Knowledge Base detail view
// ============================================================================

interface KnowledgeBaseDetailProps {
  block: ResourceCenterKnowledgeBaseBlock;
}

export const KnowledgeBaseDetail = memo(({ block }: KnowledgeBaseDetailProps) => {
  const { onSearchKnowledgeBase } = useResourceCenterContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [total, setTotal] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const hasMore = articles.length < total;

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || !onSearchKnowledgeBase) return;
      setIsSearching(true);
      setHasSearched(true);
      setArticles([]);
      setTotal(0);
      try {
        const result = await onSearchKnowledgeBase(block.id, query.trim(), 0);
        setArticles(result.articles);
        setTotal(result.total);
      } finally {
        setIsSearching(false);
      }
    },
    [block.id, onSearchKnowledgeBase],
  );

  // Auto-search with defaultSearchQuery on mount
  useEffect(() => {
    if (block.defaultSearchQuery) {
      setSearchQuery(block.defaultSearchQuery);
    }
  }, [block.id]);

  // Debounced auto-search on input change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setArticles([]);
      setTotal(0);
      setHasSearched(false);
      return;
    }
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadMore = useCallback(async () => {
    if (!onSearchKnowledgeBase || isLoadingMore || !hasMore || !searchQuery.trim()) return;
    setIsLoadingMore(true);
    try {
      const result = await onSearchKnowledgeBase(block.id, searchQuery.trim(), articles.length);
      setArticles((prev) => [...prev, ...result.articles]);
      setTotal(result.total);
    } finally {
      setIsLoadingMore(false);
    }
  }, [block.id, onSearchKnowledgeBase, isLoadingMore, hasMore, searchQuery, articles.length]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      loadMore();
    }
  }, [loadMore, isLoadingMore, hasMore]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearch(searchQuery);
      }
    },
    [handleSearch, searchQuery],
  );

  const externalUrl = block.knowledgeBaseUrl;

  return (
    <div className="flex flex-col gap-3 p-2">
      {/* Title row with optional external link */}
      <div className="flex items-center justify-between px-1">
        <span className="text-base font-semibold text-sdk-resource-center-foreground">
          {block.name || 'Knowledge base'}
        </span>
        {externalUrl && (
          <a
            href={externalUrl.startsWith('http') ? externalUrl : `https://${externalUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sdk-resource-center-foreground/50 hover:text-sdk-resource-center-foreground"
            aria-label="Open knowledge base"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M10 6V8H5V19H16V14H18V20C18 20.5523 17.5523 21 17 21H4C3.44772 21 3 20.5523 3 20V7C3 6.44772 3.44772 6 4 6H10ZM21 3V11H19V6.413L11.2071 14.2071L9.79289 12.7929L17.585 5H13V3H21Z" />
            </svg>
          </a>
        )}
      </div>

      {/* Search input */}
      <div className="px-1">
        <input
          type="text"
          className={cn(
            'w-full rounded-md border border-sdk-resource-center-foreground/20 bg-sdk-background px-3 py-2 text-sm',
            'text-sdk-resource-center-foreground placeholder:text-sdk-resource-center-foreground/40',
            'outline-none focus:border-sdk-primary focus:ring-1 focus:ring-sdk-primary',
          )}
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Results */}
      {isSearching && (
        <div className="py-4 text-center text-sm text-sdk-resource-center-foreground/50">
          Searching...
        </div>
      )}

      {!isSearching && hasSearched && articles.length === 0 && (
        <div className="py-4 text-center text-sm text-sdk-resource-center-foreground/50">
          No results found
        </div>
      )}

      {!isSearching && articles.length > 0 && (
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex flex-col overflow-y-auto"
        >
          <div className="px-1 pb-1 text-xs font-medium text-sdk-resource-center-foreground/50">
            Suggested articles
          </div>
          {articles.map((article, idx) => (
            <KnowledgeBaseArticleRow key={`${article.url}-${idx}`} article={article} />
          ))}
          {isLoadingMore && (
            <div className="py-2 text-center text-xs text-sdk-resource-center-foreground/50">
              Loading more...
            </div>
          )}
        </div>
      )}

      {!isSearching && !hasSearched && (
        <div className="py-4 text-center text-sm text-sdk-resource-center-foreground/40">
          Search your knowledge base
        </div>
      )}
    </div>
  );
});

KnowledgeBaseDetail.displayName = 'KnowledgeBaseDetail';

// ============================================================================
// Content List — flow/checklist item icons
// ============================================================================

const ContentListFlowIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5 flex-shrink-0 text-sdk-resource-center-foreground/60"
  >
    <path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM10 15.5L16 12L10 8.5V15.5Z" />
  </svg>
);

const ContentListChecklistIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5 flex-shrink-0 text-sdk-resource-center-foreground/60"
  >
    <path d="M11 4H21V6H11V4ZM11 8H17V10H11V8ZM11 14H21V16H11V14ZM11 18H17V20H11V18ZM3 4H9V10H3V4ZM5 6V8H7V6H5ZM3 14H9V20H3V14ZM5 16V18H7V16H5Z" />
  </svg>
);

// ============================================================================
// Content List detail view
// ============================================================================

interface ContentListDetailProps {
  block: ResourceCenterContentListBlock;
}

export const ContentListDetail = memo(({ block }: ContentListDetailProps) => {
  const { contentListItems, onContentListItemClick } = useResourceCenterContext();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return contentListItems;
    const query = searchQuery.trim().toLowerCase();
    return contentListItems.filter((item) => item.name.toLowerCase().includes(query));
  }, [contentListItems, searchQuery]);

  const showSearch = block.showSearchField;

  return (
    <div className="flex flex-col gap-3 p-2">
      {showSearch && (
        <div className="px-1">
          <input
            type="text"
            className={cn(
              'w-full rounded-md border border-sdk-resource-center-foreground/20 bg-sdk-background px-3 py-2 text-sm',
              'text-sdk-resource-center-foreground placeholder:text-sdk-resource-center-foreground/40',
              'outline-none focus:border-sdk-primary focus:ring-1 focus:ring-sdk-primary',
            )}
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {filteredItems.length === 0 && (
        <div className="py-4 text-center text-sm text-sdk-resource-center-foreground/50">
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
              {item.contentType === 'flow' ? <ContentListFlowIcon /> : <ContentListChecklistIcon />}
              <span className="min-w-0 flex-1 truncate text-sdk-resource-center-foreground">
                {item.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

ContentListDetail.displayName = 'ContentListDetail';

// ============================================================================
// DetailView — switch on page type (replaces 4 if-cascades)
// ============================================================================

interface DetailViewProps {
  page: ResourceCenterPageEntry;
  subPageEditSlot?: React.ReactNode;
}

export const DetailView = memo(({ page, subPageEditSlot }: DetailViewProps) => {
  switch (page.type) {
    case ResourceCenterBlockType.SUB_PAGE:
      return <SubPageDetail block={page.block} editSlot={subPageEditSlot} />;
    case ResourceCenterBlockType.KNOWLEDGE_BASE:
      return <KnowledgeBaseDetail block={page.block} />;
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
        'hsl(var(--usertour-resource-center-primary-color))';
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

  return (
    <div
      className={cn(
        'relative order-2 min-h-0 min-w-0 flex-1 bg-sdk-resource-center-background',
        'group-data-[animate-frame=true]:transition-opacity',
        'group-data-[animate-frame=true]:duration-sdk-resource-center',
        'group-data-[state=closed]:absolute group-data-[state=closed]:invisible group-data-[state=closed]:opacity-0',
        'group-data-[animating]:pointer-events-none group-data-[animating]:overflow-hidden',
      )}
    >
      {/* Close button: absolute in outer container, does not scroll */}
      {isHomePage && (
        <div className="absolute top-2 right-2 z-30">
          <ResourceCenterCloseButton />
        </div>
      )}
      {/* Scrollable inner container */}
      <div className="relative h-full overflow-y-auto overflow-x-hidden">
        {/* Background layer: absolute, overflows slightly to avoid edge gaps */}
        {isHomePage && (
          <div className="overflow-hidden absolute -inset-x-3 -top-3 pointer-events-none">
            <div className="overflow-hidden relative w-full bg-gradient-to-b from-transparent h-[520px] to-sdk-resource-center-background">
              <div
                className={cn(
                  'w-full h-full',
                  !headerBackgroundStyle && 'bg-sdk-resource-center-primary/90',
                )}
                style={headerBackgroundStyle}
              />
              <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-sdk-resource-center-background" />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-sdk-resource-center-background" />
            </div>
          </div>
        )}
        {/* Content: logo + children, scrolls together */}
        <div
          className={cn(
            'relative z-20 px-4 pb-4 flex flex-col gap-2.5 animate-sdk-rc-slide-in',
            !isHomePage && 'pt-4',
          )}
        >
          {isHomePage && (
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
      checklistSlot,
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
              {block.type === ResourceCenterBlockType.MESSAGE && (
                <ResourceCenterMessageBlockView
                  block={block}
                  userAttributes={userAttributes}
                  onContentClick={onContentClick}
                  onBlockClick={onBlockClick}
                  editSlot={messageEditSlots?.[block.id]}
                />
              )}
              {block.type === ResourceCenterBlockType.CHECKLIST && (
                <ResourceCenterChecklistBlockView slot={checklistSlot} />
              )}
              {block.type === ResourceCenterBlockType.DIVIDER && (
                <ResourceCenterDividerBlockView block={block} />
              )}
              {block.type === ResourceCenterBlockType.ACTION && (
                <ResourceCenterActionBlockView block={block} onActionBlockClick={onBlockClick} />
              )}
              {(block.type === ResourceCenterBlockType.SUB_PAGE ||
                block.type === ResourceCenterBlockType.KNOWLEDGE_BASE ||
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
