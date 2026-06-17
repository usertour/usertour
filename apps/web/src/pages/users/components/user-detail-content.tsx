import { useListAttributesQuery, useUserListQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, EnvelopeClosedIcon, IdCardIcon } from '@radix-ui/react-icons';
import { CompanyIcon, Delete2Icon } from '@usertour/icons';
import { MoreButton, SectionBreadcrumbHeader } from '@/components/section-breadcrumb-header';
import {
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
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import {
  AttributeBizTypes,
  AttributeDataType,
  type BizUser,
  type BizUserOnCompany,
  UserAttributes,
} from '@usertour/types';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserSessions } from './sessions/user-sessions';
import { UserCompaniesTab } from './user-companies-tab';
import { UserActivityFeed } from '@/components/activity-feed';
import { formatAttributeValue } from '@/utils/common';
import { BulkDeleteFromSegmentDialog } from '@/components/segments';
import { useAppContext } from '@/contexts/app-context';
import { useDerivedEntityAttributes } from '@/hooks/use-derived-entity-attributes';
import { EntityAttributesCard } from '@/components/segments/entity/entity-attributes-card';

const COMPANY_CHIP_VISIBLE_LIMIT = 3;

type ActivityView = 'events' | 'sessions' | 'companies';

interface UserDetailContentProps {
  environmentId: string;
  userId: string;
}

type UserData = Record<string, unknown> | undefined;

const userDisplayName = (bizUser: BizUser, fallback: string): string => {
  const data = bizUser.data as UserData;
  return (
    (data?.name as string | undefined) ||
    (data?.email as string | undefined) ||
    bizUser.externalId ||
    fallback
  );
};

const CompanyChips = ({
  memberships,
  environmentId,
}: { memberships: BizUserOnCompany[]; environmentId: string }) => {
  const { t } = useTranslation();
  const visible = memberships.slice(0, COMPANY_CHIP_VISIBLE_LIMIT);
  const overflow = memberships.length - visible.length;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {visible.map((membership) => {
        const company = membership.bizCompany;
        if (!company) return null;
        const label = company.data?.name || company.externalId;
        return (
          <Link
            key={company.id}
            to={`/env/${environmentId}/company/${company.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs text-foreground/80 transition-colors hover:bg-muted"
          >
            <CompanyIcon width={12} height={12} className="shrink-0 text-foreground/60" />
            <span className="max-w-[160px] truncate">{label}</span>
          </Link>
        );
      })}
      {overflow > 0 && (
        <span className="text-xs text-muted-foreground">
          {t('users.detail.companiesChip.moreCount', { count: overflow })}
        </span>
      )}
    </div>
  );
};

const UserIdentityHeader = ({
  bizUser,
  environmentId,
}: { bizUser: BizUser; environmentId: string }) => {
  const { t } = useTranslation();
  const data = bizUser.data as UserData;
  const email = data?.email as string | undefined;
  const name = data?.name as string | undefined;
  const lastSeen = (data?.[UserAttributes.LAST_SEEN_AT] as string | undefined) || bizUser.createdAt;
  const memberships = bizUser.bizUsersOnCompany ?? [];

  return (
    <div className="flex items-start gap-4 px-1">
      <DefaultAvatar seed={bizUser.externalId || email || ''} name={name} size="lg" />
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold text-foreground truncate">
          {userDisplayName(bizUser, t('users.detail.unnamedUser'))}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {email && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <EnvelopeClosedIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{email}</span>
            </span>
          )}
          {bizUser.externalId && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex min-w-0 items-center gap-1.5 cursor-help">
                    <IdCardIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{bizUser.externalId}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('users.detail.externalIdTooltip')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {lastSeen && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span>
                {t('users.detail.lastSeen')}{' '}
                {formatAttributeValue(lastSeen, AttributeDataType.DateTime)}
              </span>
            </span>
          )}
        </div>
        {memberships.length > 0 && (
          <CompanyChips memberships={memberships} environmentId={environmentId} />
        )}
      </div>
    </div>
  );
};

const UserActivityCard = ({
  environmentId,
  bizUser,
}: { environmentId: string; bizUser: BizUser }) => {
  const { t } = useTranslation();
  const [activityView, setActivityView] = useState<ActivityView>('events');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
        <CardTitle className="text-sm font-semibold">{t('users.detail.activity.title')}</CardTitle>
        <ToggleGroup
          type="single"
          value={activityView}
          onValueChange={(value) => {
            if (value === 'events' || value === 'sessions' || value === 'companies') {
              setActivityView(value);
            }
          }}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="events">{t('users.detail.activity.events')}</ToggleGroupItem>
          <ToggleGroupItem value="sessions">{t('users.detail.activity.sessions')}</ToggleGroupItem>
          <ToggleGroupItem value="companies">
            {t('users.detail.activity.companies')}
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {activityView === 'events' && (
          <UserActivityFeed environmentId={environmentId} userId={bizUser.id} />
        )}
        {activityView === 'sessions' && bizUser.externalId && (
          <UserSessions environmentId={environmentId} externalUserId={bizUser.externalId} />
        )}
        {activityView === 'companies' && (
          <UserCompaniesTab bizUser={bizUser} environmentId={environmentId} />
        )}
      </CardContent>
    </Card>
  );
};

export const UserDetailContent = (props: UserDetailContentProps) => {
  const { environmentId, userId } = props;
  const navigator = useNavigate();
  // Detail-page fetch: single user by id. Apollo dedup means navigating
  // here from the list doesn't re-issue the network if the user is
  // already in cache from the list query.
  const { contents, loading: userListLoading } = useUserListQuery({
    query: { environmentId, userId },
    options: { skip: !environmentId || !userId },
  });
  const bizUser = useMemo(
    () => contents?.find((c: BizUser) => c.id === userId),
    [contents, userId],
  );
  const { isViewOnly, project } = useAppContext();
  const { attributes: attributeList } = useListAttributesQuery(
    project?.id ?? '',
    AttributeBizTypes.Nil,
    { ...SHARED_CACHE_QUERY_OPTIONS, skip: !project?.id },
  );
  const userAttributes = useDerivedEntityAttributes(
    bizUser?.data as Record<string, unknown> | undefined,
    attributeList,
    AttributeBizTypes.User,
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { t } = useTranslation();

  const handleDeleteSuccess = (success: boolean) => {
    if (success) {
      navigator(`/env/${environmentId}/users`);
    }
  };

  if (userListLoading) {
    return <ContentLoading message={t('common.loading')} />;
  }

  if (!bizUser) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <img src="/images/rocket.png" alt="User not found" className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-muted-foreground text-center">{t('users.detail.notFound')}</p>
      </div>
    );
  }

  return (
    <>
      <SectionBreadcrumbHeader
        items={[
          { label: t('users.detail.breadcrumb'), to: `/env/${environmentId}/users` },
          { label: userDisplayName(bizUser, t('users.detail.unnamedUser')) },
        ]}
        menu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <MoreButton aria-label={t('users.detail.actionsMenu')} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                disabled={isViewOnly}
                variant="destructive"
              >
                <Delete2Icon className="mr-2 h-4 w-4" />
                {t('users.actions.deleteUser')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 p-6 xl:p-8">
        <UserIdentityHeader bizUser={bizUser} environmentId={environmentId} />

        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <UserActivityCard environmentId={environmentId} bizUser={bizUser} />
          </div>
          <div className="w-full flex-none xl:sticky xl:top-20 xl:w-[420px] xl:self-start">
            <EntityAttributesCard
              title={t('users.detail.userAttributes')}
              attributes={userAttributes}
            />
          </div>
        </div>
      </div>

      <BulkDeleteFromSegmentDialog
        entity="user"
        ids={[bizUser.id]}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onSubmit={handleDeleteSuccess}
      />
    </>
  );
};

UserDetailContent.displayName = 'UserDetailContent';
