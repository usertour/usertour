import { Fragment, memo, useCallback, useMemo, useState } from 'react';
import type {
  ResourceCenterActionBlock,
  ResourceCenterContentListBlock,
  ResourceCenterDividerBlock,
  ResourceCenterKnowledgeBaseBlock,
  ResourceCenterMessageBlock,
  ResourceCenterNavigableBlock,
  ResourceCenterPageEntry,
  ResourceCenterSubPageBlock,
  UserTourTypes,
} from '@usertour/types';
import { LauncherIconSource, ResourceCenterBlockType } from '@usertour/types';
import { cn } from '@usertour-packages/tailwind';
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
        return <Icon size={size} className={cn('flex-shrink-0 text-sdk-foreground', className)} />;
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
      return <div className="p-2">{editSlot}</div>;
    }

    const handleContentClick = async (element: any) => {
      onContentClick?.(element);
      onBlockClick?.(block.id);
    };

    return (
      <div className="p-2">
        <ContentEditorSerialize
          contents={block.content}
          onClick={handleContentClick}
          userAttributes={userAttributes}
        />
      </div>
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
      <div data-block-id={block.id} className="my-4 h-px overflow-hidden bg-sdk-foreground/10" />
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
        className="flex w-full items-center gap-3 rounded-md p-2 text-left text-sm transition-colors hover:bg-sdk-hover cursor-pointer"
        onClick={handleClick}
      >
        <BlockIcon
          iconSource={block.iconSource}
          iconType={block.iconType}
          iconUrl={block.iconUrl}
        />
        <span className="min-w-0 flex-1 truncate text-sdk-foreground">
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
      className="flex w-full items-center gap-3 rounded-md p-2 text-left text-sm transition-colors hover:bg-sdk-hover cursor-pointer"
      onClick={handleClick}
    >
      <BlockIcon iconSource={block.iconSource} iconType={block.iconType} iconUrl={block.iconUrl} />
      <span className="min-w-0 flex-1 truncate text-sdk-foreground">{label}</span>
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
    return <div className="p-2">{editSlot}</div>;
  }

  const handleContentClick = async (element: any) => {
    onContentClick?.(element);
    onBlockClick?.(block.id);
  };

  return (
    <div className="p-2">
      <ContentEditorSerialize
        contents={block.content}
        onClick={handleContentClick}
        userAttributes={userAttributes}
      />
    </div>
  );
});

SubPageDetail.displayName = 'SubPageDetail';

// ============================================================================
// Knowledge Base — search result article item
// ============================================================================

export interface KnowledgeBaseArticle {
  title: string;
  snippet: string;
  url: string;
  date?: string;
}

const KnowledgeBaseArticleItem = memo(({ article }: { article: KnowledgeBaseArticle }) => {
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
        className="h-5 w-5 flex-shrink-0 text-sdk-foreground/50 mt-0.5"
      >
        <path d="M20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22ZM7 6V8H17V6H7ZM7 10V12H17V10H7ZM7 14V16H14V14H7Z" />
      </svg>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-sdk-foreground line-clamp-2">{article.title}</div>
        {article.date && (
          <div className="text-xs text-sdk-foreground/50 mt-0.5">{article.date}</div>
        )}
        {article.snippet && (
          <div className="text-xs text-sdk-foreground/70 mt-1 line-clamp-3">{article.snippet}</div>
        )}
      </div>
    </a>
  );
});

KnowledgeBaseArticleItem.displayName = 'KnowledgeBaseArticleItem';

// ============================================================================
// Knowledge Base detail view
// ============================================================================

interface KnowledgeBaseDetailProps {
  block: ResourceCenterKnowledgeBaseBlock;
}

export const KnowledgeBaseDetail = memo(({ block }: KnowledgeBaseDetailProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return;
      setIsSearching(true);
      setHasSearched(true);
      try {
        const results = await fetchKnowledgeBaseArticles(
          block.searchProvider,
          block.knowledgeBaseUrl,
          query.trim(),
        );
        setArticles(results);
      } finally {
        setIsSearching(false);
      }
    },
    [block.searchProvider, block.knowledgeBaseUrl],
  );

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
        <span className="text-base font-semibold text-sdk-foreground">
          {block.name || 'Knowledge base'}
        </span>
        {externalUrl && (
          <a
            href={externalUrl.startsWith('http') ? externalUrl : `https://${externalUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sdk-foreground/50 hover:text-sdk-foreground"
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
            'w-full rounded-md border border-sdk-foreground/20 bg-sdk-background px-3 py-2 text-sm',
            'text-sdk-foreground placeholder:text-sdk-foreground/40',
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
        <div className="py-4 text-center text-sm text-sdk-foreground/50">Searching...</div>
      )}

      {!isSearching && hasSearched && articles.length === 0 && (
        <div className="py-4 text-center text-sm text-sdk-foreground/50">No results found</div>
      )}

      {!isSearching && articles.length > 0 && (
        <div className="flex flex-col">
          <div className="px-1 pb-1 text-xs font-medium text-sdk-foreground/50">
            Suggested articles
          </div>
          {articles.map((article, idx) => (
            <KnowledgeBaseArticleItem key={`${article.url}-${idx}`} article={article} />
          ))}
        </div>
      )}

      {!isSearching && !hasSearched && (
        <div className="py-4 text-center text-sm text-sdk-foreground/40">
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
    className="h-5 w-5 flex-shrink-0 text-sdk-foreground/60"
  >
    <path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM10 15.5L16 12L10 8.5V15.5Z" />
  </svg>
);

const ContentListChecklistIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5 flex-shrink-0 text-sdk-foreground/60"
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
              'w-full rounded-md border border-sdk-foreground/20 bg-sdk-background px-3 py-2 text-sm',
              'text-sdk-foreground placeholder:text-sdk-foreground/40',
              'outline-none focus:border-sdk-primary focus:ring-1 focus:ring-sdk-primary',
            )}
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

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
              {item.contentType === 'flow' ? <ContentListFlowIcon /> : <ContentListChecklistIcon />}
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
// Knowledge Base — search API helper
// ============================================================================

async function fetchKnowledgeBaseArticles(
  provider: string,
  baseUrl: string,
  query: string,
): Promise<KnowledgeBaseArticle[]> {
  try {
    const normalizedUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    const encodedQuery = encodeURIComponent(query);

    let apiUrl: string;

    switch (provider) {
      case 'freshdesk': {
        apiUrl = `${normalizedUrl}/api/v2/search/solutions?term=${encodedQuery}`;
        break;
      }
      case 'zendesk': {
        const baseForApi = normalizedUrl.replace(/\/$/, '');
        apiUrl = `${baseForApi}/api/v2/help_center/articles/search.json?query=${encodedQuery}`;
        break;
      }
      case 'hubspot': {
        apiUrl = `${normalizedUrl}/api/v2/kb/search?query=${encodedQuery}`;
        break;
      }
      default: {
        const siteUrl = normalizedUrl.replace(/^https?:\/\//, '');
        apiUrl = `https://www.googleapis.com/customsearch/v1?q=site:${siteUrl}+${encodedQuery}`;
        break;
      }
    }

    const response = await fetch(apiUrl);
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return parseSearchResults(provider, data);
  } catch {
    return [];
  }
}

function parseSearchResults(provider: string, data: any): KnowledgeBaseArticle[] {
  try {
    switch (provider) {
      case 'freshdesk': {
        const items = Array.isArray(data) ? data : (data?.results ?? []);
        return items.slice(0, 10).map((item: any) => ({
          title: item.title ?? '',
          snippet: item.description ?? item.desc_un_html ?? '',
          url: item.url ?? '#',
          date: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : undefined,
        }));
      }
      case 'zendesk': {
        const results = data?.results ?? [];
        return results.slice(0, 10).map((item: any) => ({
          title: item.title ?? '',
          snippet: item.snippet ?? item.body?.substring(0, 200) ?? '',
          url: item.html_url ?? '#',
          date: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : undefined,
        }));
      }
      case 'hubspot': {
        const results = data?.results ?? data?.objects ?? [];
        return results.slice(0, 10).map((item: any) => ({
          title: item.title ?? item.name ?? '',
          snippet: item.description ?? item.metaDescription ?? '',
          url: item.url ?? '#',
          date: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : undefined,
        }));
      }
      default: {
        const items = data?.items ?? [];
        return items.slice(0, 10).map((item: any) => ({
          title: item.title ?? '',
          snippet: item.snippet ?? '',
          url: item.link ?? '#',
          date: undefined,
        }));
      }
    }
  } catch {
    return [];
  }
}

// ============================================================================
// Body
// ============================================================================

export const ResourceCenterBody = memo(({ children }: { children: React.ReactNode }) => {
  const { showBackButton, nav, data } = useResourceCenterContext();
  const isHomePage = !showBackButton && nav.activeTabId === (data.tabs[0]?.id ?? '');

  return (
    <div
      className={cn(
        'order-2 min-h-0 min-w-0 flex-1 overflow-y-auto bg-sdk-background',
        'group-data-[animate-frame=true]:transition-opacity',
        'group-data-[animate-frame=true]:duration-sdk-resource-center',
        'group-data-[state=closed]:absolute group-data-[state=closed]:invisible group-data-[state=closed]:opacity-0',
        'group-data-[animating]:pointer-events-none group-data-[animating]:overflow-hidden',
      )}
    >
      {isHomePage && (
        <>
          {/* Gradient background: header color fades into body background */}
          <div className="relative overflow-hidden h-[520px] -mb-[520px]">
            <div className="w-full h-full bg-sdk-resource-center-header-background/90" />
            <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-sdk-background" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-sdk-background" />
          </div>
        </>
      )}
      {/* Close button — sticky top-right, floats over gradient */}
      {isHomePage && (
        <div className="sticky top-0 z-10 flex justify-end p-2">
          <ResourceCenterCloseButton />
        </div>
      )}
      <div className="relative p-4">{children}</div>
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
      userAttributes,
      onContentClick,
      onBlockClick,
      checklistSlot,
      actions,
    } = useResourceCenterContext();

    // If a detail page is active, render it
    if (currentPage) {
      return <DetailView page={currentPage} subPageEditSlot={subPageEditSlot} />;
    }

    // Render the current tab's block list
    const blocks = currentTab?.blocks ?? [];

    return (
      <>
        {blocks.map((block, index) => {
          return (
            <Fragment key={block.id}>
              <div
                className="animate-sdk-rc-slide-in opacity-0"
                style={{ animationDelay: `${index * 60}ms` }}
              >
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
              </div>
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
