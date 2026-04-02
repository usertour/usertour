import { Fragment, memo, useCallback, useState } from 'react';
import type {
  ResourceCenterActionBlock,
  ResourceCenterDividerBlock,
  ResourceCenterKnowledgeBaseBlock,
  ResourceCenterMessageBlock,
  ResourceCenterSubPageBlock,
  UserTourTypes,
} from '@usertour/types';
import { LauncherIconSource, ResourceCenterBlockType } from '@usertour/types';
import { cn } from '@usertour-packages/tailwind';
import { ContentEditorSerialize } from '../../serialize/content-editor-serialize';
import { useResourceCenterContext } from './context';
import { IconsList } from '../launcher';

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

    const renderIcon = () => {
      if (block.iconSource === LauncherIconSource.NONE) {
        return null;
      }
      if (
        (block.iconSource === LauncherIconSource.UPLOAD ||
          block.iconSource === LauncherIconSource.URL) &&
        block.iconUrl
      ) {
        return <img src={block.iconUrl} alt="" className="h-5 w-5 flex-shrink-0 object-contain" />;
      }
      if (block.iconSource === LauncherIconSource.BUILTIN && block.iconType) {
        const iconItem = IconsList.find((item) => item.name === block.iconType);
        if (iconItem) {
          const Icon = iconItem.ICON;
          return <Icon size={20} className="flex-shrink-0 text-sdk-foreground" />;
        }
      }
      return null;
    };

    return (
      <button
        type="button"
        data-block-id={block.id}
        className="flex w-full items-center gap-3 rounded-md p-2 text-left text-sm transition-colors hover:bg-sdk-hover cursor-pointer"
        onClick={handleClick}
      >
        {renderIcon()}
        <span className="min-w-0 flex-1 truncate text-sdk-foreground">
          {block.name || 'Untitled action'}
        </span>
      </button>
    );
  },
);

ResourceCenterActionBlockView.displayName = 'ResourceCenterActionBlockView';

// ============================================================================
// Block — SUB_PAGE (row in the main panel)
// ============================================================================

interface ResourceCenterSubPageBlockViewProps {
  block: ResourceCenterSubPageBlock;
  onSubPageClick?: (block: ResourceCenterSubPageBlock) => void;
}

export const ResourceCenterSubPageBlockView = memo(
  ({ block, onSubPageClick }: ResourceCenterSubPageBlockViewProps) => {
    const handleClick = () => {
      onSubPageClick?.(block);
    };

    const renderIcon = () => {
      if (block.iconSource === LauncherIconSource.NONE) {
        return null;
      }
      if (
        (block.iconSource === LauncherIconSource.UPLOAD ||
          block.iconSource === LauncherIconSource.URL) &&
        block.iconUrl
      ) {
        return <img src={block.iconUrl} alt="" className="h-5 w-5 flex-shrink-0 object-contain" />;
      }
      if (block.iconSource === LauncherIconSource.BUILTIN && block.iconType) {
        const iconItem = IconsList.find((item) => item.name === block.iconType);
        if (iconItem) {
          const Icon = iconItem.ICON;
          return <Icon size={20} className="flex-shrink-0 text-sdk-foreground" />;
        }
      }
      return null;
    };

    return (
      <button
        type="button"
        data-block-id={block.id}
        className="flex w-full items-center gap-3 rounded-md p-2 text-left text-sm transition-colors hover:bg-sdk-hover cursor-pointer"
        onClick={handleClick}
      >
        {renderIcon()}
        <span className="min-w-0 flex-1 truncate text-sdk-foreground">
          {block.name || 'Untitled sub-page'}
        </span>
      </button>
    );
  },
);

ResourceCenterSubPageBlockView.displayName = 'ResourceCenterSubPageBlockView';

// ============================================================================
// Sub-page content view (second-level panel content)
// ============================================================================

interface ResourceCenterSubPageContentProps {
  editSlot?: React.ReactNode;
}

export const ResourceCenterSubPageContent = memo(
  ({ editSlot }: ResourceCenterSubPageContentProps) => {
    const { activeSubPage, userAttributes, onContentClick, onBlockClick } =
      useResourceCenterContext();

    if (!activeSubPage) return null;

    if (editSlot) {
      return <div className="p-2">{editSlot}</div>;
    }

    const handleContentClick = async (element: any) => {
      onContentClick?.(element);
      onBlockClick?.(activeSubPage.id);
    };

    return (
      <div className="p-2">
        <ContentEditorSerialize
          contents={activeSubPage.content}
          onClick={handleContentClick}
          userAttributes={userAttributes}
        />
      </div>
    );
  },
);

ResourceCenterSubPageContent.displayName = 'ResourceCenterSubPageContent';

// ============================================================================
// Block — KNOWLEDGE_BASE (row in the main panel)
// ============================================================================

interface ResourceCenterKnowledgeBaseBlockViewProps {
  block: ResourceCenterKnowledgeBaseBlock;
  onKnowledgeBaseClick?: (block: ResourceCenterKnowledgeBaseBlock) => void;
}

export const ResourceCenterKnowledgeBaseBlockView = memo(
  ({ block, onKnowledgeBaseClick }: ResourceCenterKnowledgeBaseBlockViewProps) => {
    const handleClick = () => {
      onKnowledgeBaseClick?.(block);
    };

    const renderIcon = () => {
      if (block.iconSource === LauncherIconSource.NONE) {
        return null;
      }
      if (
        (block.iconSource === LauncherIconSource.UPLOAD ||
          block.iconSource === LauncherIconSource.URL) &&
        block.iconUrl
      ) {
        return <img src={block.iconUrl} alt="" className="h-5 w-5 flex-shrink-0 object-contain" />;
      }
      if (block.iconSource === LauncherIconSource.BUILTIN && block.iconType) {
        const iconItem = IconsList.find((item) => item.name === block.iconType);
        if (iconItem) {
          const Icon = iconItem.ICON;
          return <Icon size={20} className="flex-shrink-0 text-sdk-foreground" />;
        }
      }
      return null;
    };

    return (
      <button
        type="button"
        data-block-id={block.id}
        className="flex w-full items-center gap-3 rounded-md p-2 text-left text-sm transition-colors hover:bg-sdk-hover cursor-pointer"
        onClick={handleClick}
      >
        {renderIcon()}
        <span className="min-w-0 flex-1 truncate text-sdk-foreground">
          {block.name || 'Knowledge base'}
        </span>
      </button>
    );
  },
);

ResourceCenterKnowledgeBaseBlockView.displayName = 'ResourceCenterKnowledgeBaseBlockView';

// ============================================================================
// Knowledge Base — search result article item
// ============================================================================

export interface KnowledgeBaseArticle {
  title: string;
  snippet: string;
  url: string;
  date?: string;
}

interface KnowledgeBaseArticleItemProps {
  article: KnowledgeBaseArticle;
}

const KnowledgeBaseArticleItem = memo(({ article }: KnowledgeBaseArticleItemProps) => {
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
// Knowledge Base content view (second-level panel)
// ============================================================================

export const ResourceCenterKnowledgeBaseContent = memo(() => {
  const { activeKnowledgeBase } = useResourceCenterContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(
    async (query: string) => {
      if (!activeKnowledgeBase || !query.trim()) return;
      setIsSearching(true);
      setHasSearched(true);
      try {
        const results = await fetchKnowledgeBaseArticles(
          activeKnowledgeBase.searchProvider,
          activeKnowledgeBase.knowledgeBaseUrl,
          query.trim(),
        );
        setArticles(results);
      } finally {
        setIsSearching(false);
      }
    },
    [activeKnowledgeBase],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearch(searchQuery);
      }
    },
    [handleSearch, searchQuery],
  );

  if (!activeKnowledgeBase) return null;

  const externalUrl = activeKnowledgeBase.knowledgeBaseUrl;

  return (
    <div className="flex flex-col gap-3 p-2">
      {/* Title row with optional external link */}
      <div className="flex items-center justify-between px-1">
        <span className="text-base font-semibold text-sdk-foreground">
          {activeKnowledgeBase.name || 'Knowledge base'}
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

ResourceCenterKnowledgeBaseContent.displayName = 'ResourceCenterKnowledgeBaseContent';

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
        // Freshdesk public solutions search API
        apiUrl = `${normalizedUrl}/api/v2/search/solutions?term=${encodedQuery}`;
        break;
      }
      case 'zendesk': {
        // Zendesk Help Center search API
        const baseForApi = normalizedUrl.replace(/\/$/, '');
        apiUrl = `${baseForApi}/api/v2/help_center/articles/search.json?query=${encodedQuery}`;
        break;
      }
      case 'hubspot': {
        // HubSpot Knowledge Base search API
        apiUrl = `${normalizedUrl}/api/v2/kb/search?query=${encodedQuery}`;
        break;
      }
      default: {
        // Google Custom Search via site-scoped search
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
  const { themeSetting } = useResourceCenterContext();
  const rc = themeSetting.resourceCenter;

  return (
    <div
      className={cn(
        'order-2 min-h-0 min-w-0 flex-1 overflow-y-auto bg-sdk-background p-4',
        'group-data-[animate-frame=true]:transition-opacity',
        'group-data-[animate-frame=true]:duration-sdk-resource-center',
        'group-data-[state=closed]:absolute group-data-[state=closed]:invisible group-data-[state=closed]:opacity-0',
        'group-data-[animating]:pointer-events-none group-data-[animating]:overflow-hidden',
      )}
      style={{
        maxHeight: rc?.maxHeight ? `${rc.maxHeight}px` : undefined,
      }}
    >
      {children}
    </div>
  );
});

ResourceCenterBody.displayName = 'ResourceCenterBody';

// ============================================================================
// Blocks — renders all blocks with dividers
// ============================================================================

interface ResourceCenterBlocksProps {
  messageEditSlots?: Record<string, React.ReactNode>;
  subPageEditSlot?: React.ReactNode;
}

export const ResourceCenterBlocks = memo(
  ({ messageEditSlots, subPageEditSlot }: ResourceCenterBlocksProps) => {
    const {
      data,
      userAttributes,
      onContentClick,
      onBlockClick,
      checklistSlot,
      activeSubPage,
      navigateToSubPage,
      activeKnowledgeBase,
      navigateToKnowledgeBase,
    } = useResourceCenterContext();

    // When a sub-page is active, show its content instead of the block list
    if (activeSubPage) {
      return <ResourceCenterSubPageContent editSlot={subPageEditSlot} />;
    }

    // When a knowledge base page is active, show its content
    if (activeKnowledgeBase) {
      return <ResourceCenterKnowledgeBaseContent />;
    }

    return (
      <>
        {data.blocks.map((block) => {
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
              {block.type === ResourceCenterBlockType.SUB_PAGE && (
                <ResourceCenterSubPageBlockView block={block} onSubPageClick={navigateToSubPage} />
              )}
              {block.type === ResourceCenterBlockType.KNOWLEDGE_BASE && (
                <ResourceCenterKnowledgeBaseBlockView
                  block={block}
                  onKnowledgeBaseClick={navigateToKnowledgeBase}
                />
              )}
            </Fragment>
          );
        })}

        {data.blocks.length === 0 && (
          <div className="py-8 text-center text-sm opacity-40">No blocks added yet</div>
        )}
      </>
    );
  },
);

ResourceCenterBlocks.displayName = 'ResourceCenterBlocks';
