import { useUserListContext } from '@/contexts/user-list-context';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, CopyIcon, EnvelopeClosedIcon, IdCardIcon } from '@radix-ui/react-icons';
import { CompanyIcon, Delete2Icon } from '@usertour/icons';
import { MoreButton, SectionBreadcrumbHeader } from '@/components/section-breadcrumb-header';
import { DefaultAvatar } from '@usertour/ui';
import {
  AttributeBizTypes,
  AttributeDataType,
  BizUser,
  BizUserOnCompany,
  UserAttributes,
} from '@usertour/types';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserSessions } from '../sessions';
import { UserCompaniesTab } from '../companies';
import { ActivityFeed } from '@/components/activity-feed';
import { UserActivityFeedProvider } from '@/contexts/activity-feed-context';
import { formatAttributeValue } from '@/utils/common';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour/ui';
import { Button } from '@usertour/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour/ui';
import { ToggleGroup, ToggleGroupItem } from '@usertour/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour/ui';
import { BulkDeleteFromSegmentDialog } from '@/components/segments';
import { ContentLoading } from '@usertour/ui';
import { TruncatedText } from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';
import { useListAttributesQuery } from '@usertour/hooks';

const COMPANY_CHIP_VISIBLE_LIMIT = 3;

type ActivityView = 'events' | 'sessions' | 'companies';

interface UserDetailContentProps {
  environmentId: string;
  userId: string;
}

const UserDetailContentWithLoading = ({ environmentId, userId }: UserDetailContentProps) => {
  const { loading: userListLoading } = useUserListContext();

  if (userListLoading) {
    return <ContentLoading />;
  }

  return <UserDetailContentInner environmentId={environmentId} userId={userId} />;
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
        if (!company) {
          return null;
        }
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

const UserDetailContentInner = ({ environmentId, userId }: UserDetailContentProps) => {
  const navigator = useNavigate();
  const { contents } = useUserListContext();
  // Derive synchronously during render (contents is already loaded by the
  // WithLoading gate) so we never paint a "not found" frame before an effect
  // populates it.
  const bizUser = useMemo(
    () => contents?.find((c: BizUser) => c.id === userId),
    [contents, userId],
  );
  const [bizUserAttributes, setBizUserAttributes] = useState<any[]>([]);
  const { isViewOnly, project } = useAppContext();
  // Query definitions directly (not from the shared context) with
  // cache-and-network: a fresh visit re-fetches so attributes the SDK created
  // via identify after the app loaded show up without a manual reload.
  const { attributes: attributeList } = useListAttributesQuery(
    project?.id ?? '',
    AttributeBizTypes.Nil,
    { fetchPolicy: 'cache-and-network', skip: !project?.id },
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activityView, setActivityView] = useState<ActivityView>('events');
  const copyWithToast = useCopyWithToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (attributeList && bizUser) {
      const attrs = [];
      for (const key in bizUser.data) {
        const value = (bizUser.data as any)[key];
        const userAttr = attributeList?.find(
          (attr) => attr.bizType === AttributeBizTypes.User && attr.codeName === key,
        );
        if (userAttr) {
          attrs.push({
            name: userAttr.displayName || userAttr.codeName,
            value,
            dataType: userAttr.dataType,
            predefined: userAttr.predefined,
          });
        }
      }
      attrs.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setBizUserAttributes(attrs);
    }
  }, [bizUser, attributeList]);

  const memberships = useMemo(() => bizUser?.bizUsersOnCompany ?? [], [bizUser?.bizUsersOnCompany]);

  const handleDeleteSuccess = (success: boolean) => {
    if (success) {
      navigator(`/env/${environmentId}/users`);
    }
  };

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
          {
            label:
              (bizUser?.data as any)?.name ||
              (bizUser?.data as any)?.email ||
              bizUser?.externalId ||
              t('users.detail.unnamedUser'),
          },
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
                className="text-destructive focus:text-destructive"
              >
                <Delete2Icon className="mr-2 h-4 w-4" />
                {t('users.actions.deleteUser')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 p-6 xl:p-8">
        {/* Identity header */}
        <div className="flex items-start gap-4 px-1">
          <DefaultAvatar
            seed={bizUser?.externalId || (bizUser?.data as any)?.email || ''}
            name={(bizUser?.data as any)?.name}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-foreground truncate">
              {(bizUser?.data as any)?.name ||
                (bizUser?.data as any)?.email ||
                bizUser?.externalId ||
                t('users.detail.unnamedUser')}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {(bizUser?.data as any)?.email && (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <EnvelopeClosedIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{(bizUser?.data as any)?.email}</span>
                </span>
              )}
              {bizUser?.externalId && (
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
              {(() => {
                const userData = bizUser?.data as Record<string, unknown> | undefined;
                const lastSeen =
                  (userData?.[UserAttributes.LAST_SEEN_AT] as string | undefined) ||
                  bizUser?.createdAt;
                if (!lastSeen) return null;
                return (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {t('users.detail.lastSeen')}{' '}
                      {formatAttributeValue(lastSeen, AttributeDataType.DateTime)}
                    </span>
                  </span>
                );
              })()}
            </div>
            {memberships.length > 0 && (
              <CompanyChips memberships={memberships} environmentId={environmentId} />
            )}
          </div>
        </div>

        {/* Two-column content area */}
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          {/* Left column - primary content */}
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
                <CardTitle className="text-sm font-semibold">
                  {t('users.detail.activity.title')}
                </CardTitle>
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
                  <ToggleGroupItem value="events">
                    {t('users.detail.activity.events')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="sessions">
                    {t('users.detail.activity.sessions')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="companies">
                    {t('users.detail.activity.companies')}
                  </ToggleGroupItem>
                </ToggleGroup>
              </CardHeader>
              <CardContent>
                {activityView === 'events' && (
                  <UserActivityFeedProvider environmentId={environmentId} userId={bizUser.id}>
                    <ActivityFeed environmentId={environmentId} />
                  </UserActivityFeedProvider>
                )}
                {activityView === 'sessions' && bizUser?.externalId && (
                  <UserSessions environmentId={environmentId} externalUserId={bizUser.externalId} />
                )}
                {activityView === 'companies' && (
                  <UserCompaniesTab bizUser={bizUser} environmentId={environmentId} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column - supporting attributes (sticky on xl) */}
          <div className="w-full flex-none xl:sticky xl:top-20 xl:w-[420px] xl:self-start">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold">
                  {t('users.detail.userAttributes')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bizUserAttributes.map(({ name, value, dataType }, key) => {
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
        entity="user"
        ids={bizUser ? [bizUser.id] : []}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onSubmit={handleDeleteSuccess}
      />
    </>
  );
};

export function UserDetailContent(props: UserDetailContentProps) {
  return <UserDetailContentWithLoading {...props} />;
}

UserDetailContent.displayName = 'UserDetailContent';
