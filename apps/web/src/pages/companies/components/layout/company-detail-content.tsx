import { useCompanyListContext } from '@/contexts/company-list-context';
import { CopyIcon } from '@radix-ui/react-icons';
import { MoreButton, SectionBreadcrumbHeader } from '@/components/section-breadcrumb-header';
import { Delete2Icon, SpinnerIcon } from '@usertour/icons';
import { useTranslation } from 'react-i18next';
import {
  AttributeBizTypes,
  AttributeDataType,
  BizCompany,
  PageInfo,
  BizUser,
  BizUserOnCompany,
  CompanyAttributes,
} from '@usertour/types';
import { formatAttributeValue } from '@/utils/common';
import { useEffect, useMemo, useState, createContext, useContext, ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IdCardIcon, CalendarIcon } from '@radix-ui/react-icons';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ToggleGroup,
  ToggleGroupItem,
  ContentLoading,
  TruncatedText,
  DefaultAvatar,
  ListSkeleton,
} from '@usertour/ui';
import { MembershipRow } from '@/components/membership-row';
import { BulkDeleteFromSegmentDialog } from '@/components/segments';
import { ReloadIcon } from '@radix-ui/react-icons';
import { cn } from '@usertour/tailwind';
import { useQuery } from '@apollo/client';
import { queryBizUser } from '@usertour/gql';
import { PaginationState } from '@tanstack/react-table';
import { useCallback } from 'react';
import { useAppContext } from '@/contexts/app-context';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';
import { useListAttributesQuery } from '@usertour/hooks';
import { ActivityFeed } from '@/components/activity-feed';
import { CompanyActivityFeedProvider } from '@/contexts/activity-feed-context';

// Company User List Context
interface CompanyUserListContextValue {
  contents: BizUser[];
  loading: boolean;
  totalCount: number;
  loadMore: () => void;
  refetch: () => void;
  hasNextPage: boolean;
  setPagination: (pagination: PaginationState) => void;
  companyId: string;
  reset: () => void;
}

const CompanyUserListContext = createContext<CompanyUserListContextValue | undefined>(undefined);

const useCompanyUserListContext = () => {
  const context = useContext(CompanyUserListContext);
  if (!context) {
    throw new Error('useCompanyUserListContext must be used within a CompanyUserListProvider');
  }
  return context;
};

interface CompanyUserListProviderProps {
  children: ReactNode;
  environmentId: string;
  companyId: string;
}

interface CompanyUserEdge {
  node: BizUser;
}

const CompanyUserListProvider = ({
  children,
  environmentId,
  companyId,
}: CompanyUserListProviderProps) => {
  const [contents, setContents] = useState<BizUser[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [afterCursor, setAfterCursor] = useState<string | undefined>(undefined);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const pageSize = 10;

  const { data, refetch, loading } = useQuery(queryBizUser, {
    variables: {
      first: pageSize,
      after: afterCursor,
      query: { environmentId, companyId },
      orderBy: { field: 'createdAt', direction: 'desc' },
    },
  });

  const bizUserList = data?.queryBizUser;

  useEffect(() => {
    if (!bizUserList) {
      return;
    }
    const { edges, pageInfo: newPageInfo, totalCount } = bizUserList;
    if (!edges || !newPageInfo) {
      return;
    }

    setPageInfo(newPageInfo);
    const newContents: BizUser[] = edges.map((edge: CompanyUserEdge) => {
      const e = edge;
      return { ...e.node, ...e.node.data };
    });

    setContents((prev) => {
      if (!afterCursor) {
        return newContents;
      }

      const existingIds = new Set(prev.map((content) => content.id));
      const uniqueNewContents = newContents.filter((content) => !existingIds.has(content.id));
      return [...prev, ...uniqueNewContents];
    });

    setTotalCount(totalCount);
    setIsLoadingMore(false);
  }, [afterCursor, bizUserList]);

  const loadMore = () => {
    if (!isLoadingMore && pageInfo?.hasNextPage) {
      setIsLoadingMore(true);
      setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }));
      setAfterCursor(pageInfo.endCursor);
    }
  };

  const reset = () => {
    setContents([]);
    setPagination({ pageIndex: 0, pageSize: 10 });
    setTotalCount(0);
    setIsLoadingMore(false);
    setPageInfo(null);
    setAfterCursor(undefined);
  };

  useEffect(() => {
    reset();
  }, [companyId, environmentId]);

  const handleRefetch = useCallback(() => {
    reset();
    refetch({
      first: pageSize,
      after: undefined,
      query: { environmentId, companyId },
      orderBy: { field: 'createdAt', direction: 'desc' },
    });
  }, [companyId, environmentId, refetch]);

  const value: CompanyUserListContextValue = {
    contents,
    loading: loading || isLoadingMore,
    totalCount,
    loadMore,
    refetch: handleRefetch,
    companyId,
    hasNextPage: pageInfo?.hasNextPage || false,
    setPagination,
    reset,
  };

  return (
    <CompanyUserListContext.Provider value={value}>{children}</CompanyUserListContext.Provider>
  );
};

const getMembershipData = (user: BizUser, companyId: string): Record<string, unknown> | null => {
  const membership = user.bizUsersOnCompany?.find(
    (m: BizUserOnCompany) => m.bizCompany?.id === companyId,
  );
  return (membership?.data as Record<string, unknown> | undefined) ?? null;
};

// --- CompanyUserList components ---
const LoadMoreButton = () => {
  const { t } = useTranslation();
  const { loading, hasNextPage, loadMore } = useCompanyUserListContext();

  if (!hasNextPage) {
    return null;
  }

  return (
    <div className="flex justify-center mt-4">
      <Button
        onClick={loadMore}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <SpinnerIcon className="w-4 h-4 animate-spin" />
            <span>{t('companies.detail.loading')}</span>
          </div>
        ) : (
          t('companies.detail.loadMoreUsers')
        )}
      </Button>
    </div>
  );
};

const CompanyUserList = () => {
  const { t } = useTranslation();
  const { contents, loading, refetch, totalCount, companyId } = useCompanyUserListContext();
  const { project } = useAppContext();
  // Direct cache-and-network query (not the shared context) so SDK-created
  // membership/company attributes show on a fresh visit without a reload.
  const { attributes: attributeList } = useListAttributesQuery(
    project?.id ?? '',
    AttributeBizTypes.Nil,
    { fetchPolicy: 'cache-and-network', skip: !project?.id },
  );
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">
          {t('companies.detail.membersCount', { count: totalCount })}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <ReloadIcon className={cn('w-4 h-4', loading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('companies.detail.tooltips.reload')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {loading && contents.length === 0 ? (
        <ListSkeleton length={5} />
      ) : contents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <img src="/images/rocket.png" alt="No users" className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-muted-foreground text-center">{t('companies.detail.noUsersFound')}</p>
        </div>
      ) : (
        <div className="flex flex-col w-full grow">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-2/5">{t('companies.detail.user')}</TableHead>
                <TableHead className="w-3/5">{t('common.membership.attributes')}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contents.map((user: BizUser) => {
                const membershipData = getMembershipData(user, companyId);
                const isExpanded = expandedRowId === user.id;

                const identity = (
                  <Link
                    to={`/env/${user.environmentId}/user/${user.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2 hover:text-primary underline-offset-4 hover:underline min-w-0">
                      <DefaultAvatar
                        seed={user.externalId || user.data?.email || ''}
                        name={user.data?.name || ''}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0 truncate">
                        {user.data?.email || user.externalId}
                      </div>
                    </div>
                  </Link>
                );

                return (
                  <MembershipRow
                    key={user.id}
                    identity={identity}
                    membershipData={membershipData}
                    attributeList={attributeList}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedRowId(isExpanded ? null : user.id)}
                    colSpan={3}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <LoadMoreButton />
    </div>
  );
};

type CompanyActivityView = 'events' | 'members';

interface CompanyDetailContentProps {
  environmentId: string;
  companyId: string;
}

// Loading wrapper component to handle all loading states
const CompanyDetailContentWithLoading = ({
  environmentId,
  companyId,
}: CompanyDetailContentProps) => {
  const { loading: companyListLoading } = useCompanyListContext();
  const { t } = useTranslation();

  if (companyListLoading) {
    return <ContentLoading message={t('common.loading')} />;
  }

  return <CompanyDetailContentInner environmentId={environmentId} companyId={companyId} />;
};

// Inner component that handles the actual content rendering
const CompanyDetailContentInner = ({ environmentId, companyId }: CompanyDetailContentProps) => {
  const { t } = useTranslation();
  const navigator = useNavigate();
  const { contents } = useCompanyListContext();
  // Derive synchronously during render (contents is already loaded by the
  // WithLoading gate) so we never paint a "not found" frame before an effect
  // populates it.
  const bizCompany = useMemo(
    () => contents?.find((c: BizCompany) => c.id === companyId),
    [contents, companyId],
  );
  const [bizCompanyAttributes, setBizCompanyAttributes] = useState<any[]>([]);
  const { isViewOnly, project } = useAppContext();
  const { attributes: attributeList } = useListAttributesQuery(
    project?.id ?? '',
    AttributeBizTypes.Nil,
    { fetchPolicy: 'cache-and-network', skip: !project?.id },
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activityView, setActivityView] = useState<CompanyActivityView>('events');
  const copyWithToast = useCopyWithToast();

  useEffect(() => {
    if (attributeList && bizCompany) {
      const attrs = [];
      for (const key in bizCompany.data) {
        const value = (bizCompany.data as any)[key];
        const companyAttr = attributeList?.find(
          (attr) => attr.bizType === AttributeBizTypes.Company && attr.codeName === key,
        );
        if (companyAttr) {
          attrs.push({
            name: companyAttr.displayName || companyAttr.codeName,
            value,
            dataType: companyAttr.dataType,
            predefined: companyAttr.predefined,
          });
        }
      }
      // Sort attributes by name in alphabetical order (a-z)
      attrs.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setBizCompanyAttributes(attrs);
    }
  }, [bizCompany, attributeList]);

  const handleDeleteSuccess = useCallback(
    async (success: boolean) => {
      if (success) {
        navigator(`/env/${environmentId}/companies`);
      }
    },
    [navigator, environmentId],
  );

  if (!bizCompany) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <img
          src="/images/rocket.png"
          alt="Company not found"
          className="w-16 h-16 mb-4 opacity-50"
        />
        <p className="text-muted-foreground text-center">{t('companies.detail.notFound')}</p>
      </div>
    );
  }

  return (
    <>
      <SectionBreadcrumbHeader
        items={[
          { label: t('companies.detail.breadcrumb'), to: `/env/${environmentId}/companies` },
          {
            label:
              (bizCompany?.data as any)?.name ||
              bizCompany?.externalId ||
              t('companies.detail.unnamedCompany'),
          },
        ]}
        menu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <MoreButton aria-label={t('companies.detail.actionsMenu')} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                disabled={isViewOnly}
                className="text-destructive focus:text-destructive"
              >
                <Delete2Icon className="mr-2 h-4 w-4" />
                {t('companies.actions.deleteCompany')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 p-6 xl:p-8">
        {/* Identity header */}
        <div className="flex items-start gap-4 px-1">
          <DefaultAvatar
            seed={bizCompany?.externalId || bizCompany?.data?.name || ''}
            name={bizCompany?.data?.name}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-foreground truncate">
              {bizCompany?.data?.name ||
                bizCompany?.externalId ||
                t('companies.detail.unnamedCompany')}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {bizCompany?.externalId && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex min-w-0 items-center gap-1.5 cursor-help">
                        <IdCardIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{bizCompany.externalId}</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{t('companies.detail.externalIdTooltip')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {(() => {
                const companyData = bizCompany?.data as Record<string, unknown> | undefined;
                const lastSeen =
                  (companyData?.[CompanyAttributes.LAST_SEEN_AT] as string | undefined) ||
                  bizCompany?.createdAt;
                if (!lastSeen) return null;
                return (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {t('companies.detail.lastSeen')}{' '}
                      {formatAttributeValue(lastSeen, AttributeDataType.DateTime)}
                    </span>
                  </span>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Two-column content area */}
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          {/* Left column - primary content */}
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
                <CardTitle className="text-sm font-semibold">
                  {t('companies.detail.activity.title')}
                </CardTitle>
                <ToggleGroup
                  type="single"
                  value={activityView}
                  onValueChange={(value) => {
                    if (value === 'events' || value === 'members') {
                      setActivityView(value);
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="events">
                    {t('companies.detail.activity.events')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="members">
                    {t('companies.detail.activity.members')}
                  </ToggleGroupItem>
                </ToggleGroup>
              </CardHeader>
              <CardContent>
                {activityView === 'events' && (
                  <CompanyActivityFeedProvider environmentId={environmentId} companyId={companyId}>
                    <ActivityFeed
                      environmentId={environmentId}
                      renderTrailingContent={(event) => {
                        const bizUser = event.bizUser;
                        if (!bizUser) return null;
                        const displayName =
                          bizUser.data?.name || bizUser.data?.email || bizUser.externalId;
                        return (
                          <Link
                            to={`/env/${environmentId}/user/${bizUser.id}`}
                            className="block max-w-[160px] truncate text-xs hover:text-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {displayName}
                          </Link>
                        );
                      }}
                    />
                  </CompanyActivityFeedProvider>
                )}
                {activityView === 'members' && (
                  <CompanyUserListProvider environmentId={environmentId} companyId={companyId}>
                    <CompanyUserList />
                  </CompanyUserListProvider>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column - supporting attributes (sticky on xl) */}
          <div className="w-full flex-none xl:sticky xl:top-20 xl:w-[420px] xl:self-start">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold">
                  {t('companies.detail.companyAttributes')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bizCompanyAttributes.map(({ name, value, dataType }, key) => {
                  const formattedValue = formatAttributeValue(value, dataType);
                  const isDateTime = dataType === AttributeDataType.DateTime;
                  const textToCopy = String(isDateTime ? value : formattedValue);

                  return (
                    <div
                      className="group flex min-w-0 flex-row gap-2 border-b text-sm last:border-0"
                      key={key}
                    >
                      <div className="w-2/5 min-w-0 break-words p-2 leading-6 font-medium">
                        {name}
                      </div>
                      <div className="w-3/5 min-w-0 break-words p-2 leading-6">
                        {isDateTime ? (
                          <TruncatedText
                            text={formattedValue}
                            className="max-w-full"
                            rawValue={value}
                          />
                        ) : (
                          formattedValue
                        )}
                      </div>
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        className="m-2 h-6 w-6 rounded invisible flex-shrink-0 group-hover:visible"
                        onClick={() => copyWithToast(textToCopy)}
                      >
                        <CopyIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <BulkDeleteFromSegmentDialog
        entity="company"
        ids={bizCompany ? [bizCompany.id] : []}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onSubmit={handleDeleteSuccess}
      />
    </>
  );
};

// Main export component
export const CompanyDetailContent = (props: CompanyDetailContentProps) => {
  return <CompanyDetailContentWithLoading {...props} />;
};

CompanyDetailContent.displayName = 'CompanyDetailContent';
