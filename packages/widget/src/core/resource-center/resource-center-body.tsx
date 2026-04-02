import { Fragment, memo, useCallback, useState } from 'react';
import type {
  ResourceCenterActionBlock,
  ResourceCenterContactBlock,
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
// Block — CONTACT (row in the main panel)
// ============================================================================

interface ResourceCenterContactBlockViewProps {
  block: ResourceCenterContactBlock;
  onContactEmailClick?: (block: ResourceCenterContactBlock) => void;
  onContactPhoneClick?: (block: ResourceCenterContactBlock) => void;
  onContactLiveChatClick?: (block: ResourceCenterContactBlock) => void;
}

const ContactEmailIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5"
  >
    <path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM20 7.23792L12.0718 14.338L4 7.21594V19H20V7.23792ZM4.51146 5L12.0619 11.662L19.501 5H4.51146Z" />
  </svg>
);

const ContactPhoneIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5"
  >
    <path d="M9.36556 10.6821C10.302 12.3288 11.6712 13.698 13.3179 14.6344L14.2024 13.3961C14.4965 12.9845 15.0516 12.8573 15.4956 13.0998C16.9024 13.8683 18.4571 14.3353 20.0789 14.4637C20.5906 14.5049 21 14.9389 21 15.4524V19.9981C21 20.5084 20.5947 20.9216 20.0867 20.9486C19.5091 20.9798 18.9271 20.9964 18.3412 20.9964C9.16019 20.9964 1.68823 13.5765 1.00391 4.41789C0.977047 4.0581 1.12233 3.71846 1.37624 3.48836C1.63015 3.25826 1.97402 3.15192 2.31919 3.19408L6.54778 3.00006C7.0613 3.00006 7.49527 3.40948 7.53643 3.92115C7.66477 5.54293 8.13175 7.09761 8.90025 8.50444C9.14268 8.94838 9.01553 9.50354 8.60385 9.79757L7.36556 10.6821Z" />
  </svg>
);

const ContactChatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5"
  >
    <path d="M7.29117 20.8242L2 22L3.17581 16.7088C2.42544 15.3056 2 13.7025 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C10.2975 22 8.6944 21.5746 7.29117 20.8242ZM7.58075 18.711L8.23428 19.0605C9.38248 19.6745 10.6655 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 13.3345 4.32549 14.6175 4.93949 15.7657L5.28896 16.4192L4.63416 19.3658L7.58075 18.711Z" />
  </svg>
);

export const ResourceCenterContactBlockView = memo(
  ({
    block,
    onContactEmailClick,
    onContactPhoneClick,
    onContactLiveChatClick,
  }: ResourceCenterContactBlockViewProps) => {
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
      <div
        data-block-id={block.id}
        className="flex w-full items-center gap-3 rounded-md p-2 text-sm"
      >
        {renderIcon()}
        <span className="min-w-0 flex-1 truncate text-sdk-foreground">
          {block.name || 'Contact us'}
        </span>
        <div className="flex items-center gap-1">
          {block.emailEnabled && (
            <button
              type="button"
              className="rounded-md p-1.5 text-sdk-foreground/60 hover:text-sdk-foreground hover:bg-sdk-hover cursor-pointer transition-colors"
              onClick={() => onContactEmailClick?.(block)}
              aria-label="Email"
            >
              <ContactEmailIcon />
            </button>
          )}
          {block.phoneEnabled && (
            <button
              type="button"
              className="rounded-md p-1.5 text-sdk-foreground/60 hover:text-sdk-foreground hover:bg-sdk-hover cursor-pointer transition-colors"
              onClick={() => onContactPhoneClick?.(block)}
              aria-label="Phone"
            >
              <ContactPhoneIcon />
            </button>
          )}
          {block.liveChatEnabled && (
            <button
              type="button"
              className="rounded-md p-1.5 text-sdk-foreground/60 hover:text-sdk-foreground hover:bg-sdk-hover cursor-pointer transition-colors"
              onClick={() => onContactLiveChatClick?.(block)}
              aria-label="Live chat"
            >
              <ContactChatIcon />
            </button>
          )}
        </div>
      </div>
    );
  },
);

ResourceCenterContactBlockView.displayName = 'ResourceCenterContactBlockView';

// ============================================================================
// Contact page content view (second-level panel — email or phone)
// ============================================================================

interface ResourceCenterContactPageContentProps {
  editSlot?: React.ReactNode;
}

export const ResourceCenterContactPageContent = memo(
  ({ editSlot }: ResourceCenterContactPageContentProps) => {
    const { activeContactPage, userAttributes, onContentClick, onBlockClick } =
      useResourceCenterContext();

    if (!activeContactPage) return null;

    if (editSlot) {
      return <div className="p-2">{editSlot}</div>;
    }

    const content =
      activeContactPage.page === 'email'
        ? activeContactPage.block.emailContent
        : activeContactPage.block.phoneContent;

    const handleContentClick = async (element: any) => {
      onContentClick?.(element);
      onBlockClick?.(activeContactPage.block.id);
    };

    return (
      <div className="p-2">
        <ContentEditorSerialize
          contents={content}
          onClick={handleContentClick}
          userAttributes={userAttributes}
        />
      </div>
    );
  },
);

ResourceCenterContactPageContent.displayName = 'ResourceCenterContactPageContent';

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
  contactPageEditSlot?: React.ReactNode;
}

export const ResourceCenterBlocks = memo(
  ({ messageEditSlots, subPageEditSlot, contactPageEditSlot }: ResourceCenterBlocksProps) => {
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
      activeContactPage,
      navigateToContactPage,
      onLiveChatClick,
    } = useResourceCenterContext();

    // When a sub-page is active, show its content instead of the block list
    if (activeSubPage) {
      return <ResourceCenterSubPageContent editSlot={subPageEditSlot} />;
    }

    // When a knowledge base page is active, show its content
    if (activeKnowledgeBase) {
      return <ResourceCenterKnowledgeBaseContent />;
    }

    // When a contact email/phone page is active, show its content
    if (activeContactPage) {
      return <ResourceCenterContactPageContent editSlot={contactPageEditSlot} />;
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
              {block.type === ResourceCenterBlockType.CONTACT && (
                <ResourceCenterContactBlockView
                  block={block}
                  onContactEmailClick={(b) => navigateToContactPage(b, 'email')}
                  onContactPhoneClick={(b) => navigateToContactPage(b, 'phone')}
                  onContactLiveChatClick={onLiveChatClick}
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
