import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useUserListContext } from '@/contexts/user-list-context';
import { useEventListContext } from '@/contexts/event-list-context';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon, DotsHorizontalIcon, CopyIcon } from '@radix-ui/react-icons';
import { Delete2Icon } from '@usertour-packages/icons';
import { UserAvatar } from '@/components/molecules/user-avatar';
import { AttributeBizTypes, AttributeDataType, BizUser } from '@usertour/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserSessions } from '../sessions';
import { UserCompaniesTab } from '../companies';
import { ActivityFeed } from '@/components/molecules/activity-feed';
import { UserActivityFeedProvider } from '@/contexts/activity-feed-context';
import { formatAttributeValue } from '@/utils/common';
import { IdCardIcon, EnvelopeClosedIcon, CalendarIcon } from '@radix-ui/react-icons';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';
import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import {
  Tabs,
  UnderlineTabsList,
  UnderlineTabsTrigger,
  UnderlineTabsContent,
} from '@usertour-packages/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { BizUserDeleteDialog } from '../dialogs';
import { ContentLoading } from '@/components/molecules/content-loading';
import { TruncatedText } from '@/components/molecules/truncated-text';
import { useAppContext } from '@/contexts/app-context';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';

interface UserDetailContentProps {
  environmentId: string;
  userId: string;
}

// Loading wrapper component to handle all loading states
const UserDetailContentWithLoading = ({ environmentId, userId }: UserDetailContentProps) => {
  const { loading: userListLoading } = useUserListContext();
  const { loading: eventListLoading } = useEventListContext();
  const { loading: attributeListLoading } = useAttributeListContext();

  // Check if any provider is still loading
  const isLoading = userListLoading || eventListLoading || attributeListLoading;

  if (isLoading) {
    return <ContentLoading />;
  }

  return <UserDetailContentInner environmentId={environmentId} userId={userId} />;
};

// Inner component that handles the actual content rendering
const UserDetailContentInner = ({ environmentId, userId }: UserDetailContentProps) => {
  const navigator = useNavigate();
  const { contents } = useUserListContext();
  const [bizUser, setBizUser] = useState<BizUser>();
  const [bizUserAttributes, setBizUserAttributes] = useState<any[]>([]);
  const { attributeList } = useAttributeListContext();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { isViewOnly } = useAppContext();
  const copyWithToast = useCopyWithToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (!contents) {
      return;
    }
    const user = contents.find((c: BizUser) => c.id === userId);
    if (user) {
      setBizUser(user);
    }
  }, [contents, userId]);

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
      // Sort attributes by name in alphabetical order (a-z)
      attrs.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setBizUserAttributes(attrs);
    }
  }, [bizUser, attributeList]);

  const handleDeleteSuccess = async () => {
    navigator(`/env/${environmentId}/users`);
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
      <div className="border-b bg-white flex-row md:flex w-full sticky top-0 z-10 justify-between items-center">
        <div className="flex h-16 items-center px-4 w-full gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigator(`/env/${environmentId}/users`)}
            className="text-sm text-muted-foreground hover:text-foreground shrink-0"
          >
            {t('users.detail.breadcrumb')}
          </button>
          <ChevronRightIcon className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          <span className="text-sm font-medium truncate min-w-0">
            {(bizUser?.data as any)?.name ||
              (bizUser?.data as any)?.email ||
              bizUser?.externalId ||
              t('users.detail.unnamedUser')}
          </span>
          <div className="ml-auto shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">
                  <span className="sr-only">Actions</span>
                  <DotsHorizontalIcon className="h-4 w-4" />
                </Button>
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
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-6 xl:p-8">
        {/* Identity header */}
        <div className="flex items-start gap-4 px-1">
          <UserAvatar
            email={(bizUser?.data as any)?.email || ''}
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
              {bizUser?.createdAt && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {t('users.detail.firstSeen')}{' '}
                    {formatAttributeValue(bizUser.createdAt, AttributeDataType.DateTime)}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Two-column content area */}
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          {/* Left column - primary content */}
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Card>
              <CardContent className="pt-6">
                <Tabs defaultValue="activity-feed">
                  <UnderlineTabsList className="justify-start">
                    <UnderlineTabsTrigger value="activity-feed" className="text-base font-medium">
                      {t('users.detail.tabs.activityFeed')}
                    </UnderlineTabsTrigger>
                    <UnderlineTabsTrigger value="sessions" className="text-base font-medium">
                      {t('users.detail.tabs.sessions')}
                    </UnderlineTabsTrigger>
                    <UnderlineTabsTrigger value="companies" className="text-base font-medium">
                      {t('users.detail.tabs.companies')}
                      {bizUser?.bizUsersOnCompany && bizUser.bizUsersOnCompany.length > 0 && (
                        <span className="ml-1">({bizUser.bizUsersOnCompany.length})</span>
                      )}
                    </UnderlineTabsTrigger>
                  </UnderlineTabsList>

                  <UnderlineTabsContent value="activity-feed">
                    {bizUser && (
                      <UserActivityFeedProvider environmentId={environmentId} userId={bizUser.id}>
                        <ActivityFeed environmentId={environmentId} />
                      </UserActivityFeedProvider>
                    )}
                  </UnderlineTabsContent>

                  <UnderlineTabsContent value="sessions">
                    {bizUser?.externalId && (
                      <UserSessions
                        environmentId={environmentId}
                        externalUserId={bizUser.externalId}
                      />
                    )}
                  </UnderlineTabsContent>

                  <UnderlineTabsContent value="companies">
                    {bizUser && (
                      <UserCompaniesTab bizUser={bizUser} environmentId={environmentId} />
                    )}
                  </UnderlineTabsContent>
                </Tabs>
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

      {/* Delete Dialog */}
      <BizUserDeleteDialog
        bizUserIds={bizUser ? [bizUser.id] : []}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
};

// Main export component
export function UserDetailContent(props: UserDetailContentProps) {
  return <UserDetailContentWithLoading {...props} />;
}

UserDetailContent.displayName = 'UserDetailContent';
