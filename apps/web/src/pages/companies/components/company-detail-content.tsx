import { useCompanyListQuery, useListAttributesQuery, useUserListQuery } from '@usertour/hooks';
import { CalendarIcon, IdCardIcon, ReloadIcon } from '@radix-ui/react-icons';
import { MoreButton, SectionBreadcrumbHeader } from '@/components/section-breadcrumb-header';
import { Delete2Icon, SpinnerIcon } from '@usertour/icons';
import { useTranslation } from 'react-i18next';
import {
  AttributeBizTypes,
  AttributeDataType,
  type BizCompany,
  type BizUser,
  type BizUserOnCompany,
  CompanyAttributes,
  type PageInfo,
} from '@usertour/types';
import { formatAttributeValue } from '@/utils/common';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ContentLoading,
  DefaultAvatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ListSkeleton,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { MembershipRow } from '@/components/membership-row';
import { BulkDeleteFromSegmentDialog } from '@/components/segments';
import { cn } from '@usertour/tailwind';
import { useAppContext } from '@/contexts/app-context';
import { ActivityFeed } from '@/components/activity-feed';
import { CompanyActivityFeedProvider } from '@/contexts/activity-feed-context';
import { useLoadMoreAccumulator } from '@/hooks/use-load-more-accumulator';
import { useDerivedEntityAttributes } from '@/hooks/use-derived-entity-attributes';
import { EntityAttributesCard } from '@/components/segments/entity/entity-attributes-card';

const PAGE_SIZE = 10;

type CompanyData = Record<string, unknown> | undefined;

const companyDisplayName = (bizCompany: BizCompany, fallback: string): string => {
  return bizCompany.data?.name || bizCompany.externalId || fallback;
};

const getMembershipData = (user: BizUser, companyId: string): Record<string, unknown> | null => {
  const membership = user.bizUsersOnCompany?.find(
    (m: BizUserOnCompany) => m.bizCompany?.id === companyId,
  );
  return (membership?.data as Record<string, unknown> | undefined) ?? null;
};

interface LoadMoreButtonProps {
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

const LoadMoreButton = ({ loading, hasMore, onLoadMore }: LoadMoreButtonProps) => {
  const { t } = useTranslation();
  if (!hasMore) return null;
  return (
    <div className="flex justify-center mt-4">
      <Button
        onClick={onLoadMore}
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

interface CompanyUserListProps {
  environmentId: string;
  companyId: string;
}

// Membership list for one company. Append-on-cursor-advance accumulation
// via `useLoadMoreAccumulator`; query goes through `useUserListQuery`
// (per ADR 0002).
const CompanyUserList = ({ environmentId, companyId }: CompanyUserListProps) => {
  const { t } = useTranslation();
  const { project } = useAppContext();

  const [afterCursor, setAfterCursor] = useState<string | undefined>(undefined);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const { contents, pageInfo, totalCount, loading, refetch } = useUserListQuery({
    query: { environmentId, companyId },
    pagination: { first: PAGE_SIZE, after: afterCursor },
  });

  const { attributes: attributeList } = useListAttributesQuery(
    project?.id ?? '',
    AttributeBizTypes.Nil,
    { fetchPolicy: 'cache-and-network', skip: !project?.id },
  );

  const {
    items: members,
    totalCount: accumulatedTotal,
    hasMore,
    loading: effectiveLoading,
    loadMore,
    refresh,
  } = useLoadMoreAccumulator<BizUser>({
    pageItems: contents,
    pageInfo: pageInfo as PageInfo | undefined,
    pageTotalCount: totalCount,
    pageLoading: loading,
    pageRefetch: refetch,
    afterCursor,
    setAfterCursor,
    resetKey: `${environmentId}:${companyId}`,
    getId: (user) => user.id,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">
          {t('companies.detail.membersCount', { count: accumulatedTotal })}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={refresh}
                disabled={effectiveLoading}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <ReloadIcon className={cn('w-4 h-4', effectiveLoading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('companies.detail.tooltips.reload')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {effectiveLoading && members.length === 0 ? (
        <ListSkeleton length={5} />
      ) : members.length === 0 ? (
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
              {members.map((user) => {
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

      <LoadMoreButton loading={effectiveLoading} hasMore={hasMore} onLoadMore={loadMore} />
    </div>
  );
};

type CompanyActivityView = 'events' | 'members';

const CompanyIdentityHeader = ({ bizCompany }: { bizCompany: BizCompany }) => {
  const { t } = useTranslation();
  const data = bizCompany.data as CompanyData;
  const name = data?.name as string | undefined;
  const lastSeen =
    (data?.[CompanyAttributes.LAST_SEEN_AT] as string | undefined) || bizCompany.createdAt;

  return (
    <div className="flex items-start gap-4 px-1">
      <DefaultAvatar seed={bizCompany.externalId || name || ''} name={name} size="lg" />
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold text-foreground truncate">
          {companyDisplayName(bizCompany, t('companies.detail.unnamedCompany'))}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {bizCompany.externalId && (
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
          {lastSeen && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span>
                {t('companies.detail.lastSeen')}{' '}
                {formatAttributeValue(lastSeen, AttributeDataType.DateTime)}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const CompanyActivityCard = ({
  environmentId,
  companyId,
}: { environmentId: string; companyId: string }) => {
  const { t } = useTranslation();
  const [activityView, setActivityView] = useState<CompanyActivityView>('events');

  return (
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
          <ToggleGroupItem value="events">{t('companies.detail.activity.events')}</ToggleGroupItem>
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
                const displayName = bizUser.data?.name || bizUser.data?.email || bizUser.externalId;
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
          <CompanyUserList environmentId={environmentId} companyId={companyId} />
        )}
      </CardContent>
    </Card>
  );
};

interface CompanyDetailContentProps {
  environmentId: string;
  companyId: string;
}

const CompanyDetailContentInner = ({ environmentId, companyId }: CompanyDetailContentProps) => {
  const { t } = useTranslation();
  const navigator = useNavigate();
  // Single-company detail fetch. Apollo cache dedups with the list query
  // if the user reached here from /companies.
  const { contents, loading: companyListLoading } = useCompanyListQuery({
    query: { environmentId, companyId },
    options: { skip: !environmentId || !companyId },
  });
  const bizCompany = useMemo(
    () => contents?.find((c: BizCompany) => c.id === companyId),
    [contents, companyId],
  );
  const { isViewOnly, project } = useAppContext();
  const { attributes: attributeList } = useListAttributesQuery(
    project?.id ?? '',
    AttributeBizTypes.Nil,
    { fetchPolicy: 'cache-and-network', skip: !project?.id },
  );
  const companyAttributes = useDerivedEntityAttributes(
    bizCompany?.data as Record<string, unknown> | undefined,
    attributeList,
    AttributeBizTypes.Company,
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteSuccess = (success: boolean) => {
    if (success) {
      navigator(`/env/${environmentId}/companies`);
    }
  };

  if (companyListLoading) {
    return <ContentLoading message={t('common.loading')} />;
  }

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
          { label: companyDisplayName(bizCompany, t('companies.detail.unnamedCompany')) },
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
        <CompanyIdentityHeader bizCompany={bizCompany} />

        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <CompanyActivityCard environmentId={environmentId} companyId={companyId} />
          </div>
          <div className="w-full flex-none xl:sticky xl:top-20 xl:w-[420px] xl:self-start">
            <EntityAttributesCard
              title={t('companies.detail.companyAttributes')}
              attributes={companyAttributes}
            />
          </div>
        </div>
      </div>

      <BulkDeleteFromSegmentDialog
        entity="company"
        ids={[bizCompany.id]}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onSubmit={handleDeleteSuccess}
      />
    </>
  );
};

export const CompanyDetailContent = (props: CompanyDetailContentProps) => {
  return <CompanyDetailContentInner {...props} />;
};

CompanyDetailContent.displayName = 'CompanyDetailContent';
