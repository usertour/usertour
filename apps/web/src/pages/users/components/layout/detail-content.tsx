import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useUserListContext } from '@/contexts/user-list-context';
import { useEventListContext } from '@/contexts/event-list-context';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, DotsHorizontalIcon, CopyIcon } from '@radix-ui/react-icons';
import { UserIcon, UserProfile, Delete2Icon } from '@usertour-packages/icons';
import { AttributeBizTypes, AttributeDataType, BizUser } from '@usertour/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserSessions } from '../sessions';
import { formatAttributeValue } from '@/utils/common';
import { IdCardIcon, EnvelopeClosedIcon, CalendarIcon, PersonIcon } from '@radix-ui/react-icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';
import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { BizUserDeleteDialog } from '../dialogs';
import { ContentLoading } from '@/components/molecules/content-loading';
import { TruncatedText } from '@/components/molecules/truncated-text';
import { useAppContext } from '@/contexts/app-context';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';

interface UserDetailContentProps {
  environmentId: string;
  userId: string;
}

// TooltipIcon component to reduce repetitive code
const TooltipIcon = ({
  icon: Icon,
  tooltipKey,
  className = 'w-4 h-4 text-foreground/60 cursor-help',
}: {
  icon: React.ComponentType<{ className?: string }>;
  tooltipKey: string;
  className?: string;
}) => {
  const { t } = useTranslation();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className={className} />
        </TooltipTrigger>
        <TooltipContent>{t(tooltipKey)}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

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
      <div className="border-b bg-white flex-row md:flex w-full fixed justify-between items-center">
        <div className="flex h-16 items-center px-4 w-full">
          <ArrowLeftIcon
            className="ml-4 h-6 w-8 cursor-pointer"
            onClick={() => {
              navigator(`/env/${environmentId}/users`);
            }}
          />
          <span>{t('users.detail.title')}</span>
          <div className="ml-auto">
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
      <div className="flex flex-row p-14 mt-12 space-x-8 justify-center">
        {/* Left column - fixed height */}
        <div className="flex flex-col w-[550px] flex-none space-y-4 h-fit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon width={18} height={18} className="mr-2" />
                {t('users.detail.userDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 gap-x-12">
                <div className="group flex items-center min-w-0 gap-2">
                  <TooltipIcon icon={IdCardIcon} tooltipKey="users.detail.tooltips.userId" />
                  <span className="flex-1 min-w-0 truncate">{bizUser?.externalId || ''}</span>
                  <Button
                    variant={'ghost'}
                    size={'icon'}
                    className="w-6 h-6 rounded invisible group-hover:visible flex-shrink-0"
                    onClick={() => copyWithToast(bizUser?.externalId || '')}
                  >
                    <CopyIcon className="w-4 h-4" />
                  </Button>
                </div>
                <div className="group flex items-center min-w-0 gap-2">
                  <TooltipIcon icon={EnvelopeClosedIcon} tooltipKey="users.detail.tooltips.email" />
                  <span className="flex-1 min-w-0 truncate">{bizUser?.data?.email || ''}</span>
                  <Button
                    variant={'ghost'}
                    size={'icon'}
                    className="w-6 h-6 rounded invisible group-hover:visible flex-shrink-0"
                    onClick={() => copyWithToast(bizUser?.data?.email || '')}
                  >
                    <CopyIcon className="w-4 h-4" />
                  </Button>
                </div>
                <div className="group flex items-center min-w-0 gap-2">
                  <TooltipIcon icon={PersonIcon} tooltipKey="users.detail.tooltips.name" />
                  <span className="flex-1 min-w-0 truncate">
                    {bizUser?.data?.name || t('users.detail.unnamedUser')}
                  </span>
                  <Button
                    variant={'ghost'}
                    size={'icon'}
                    className="w-6 h-6 rounded invisible group-hover:visible flex-shrink-0"
                    onClick={() => copyWithToast(bizUser?.data?.name || '')}
                  >
                    <CopyIcon className="w-4 h-4" />
                  </Button>
                </div>
                <div className="group flex items-center min-w-0 gap-2">
                  <TooltipIcon icon={CalendarIcon} tooltipKey="users.detail.tooltips.created" />
                  {bizUser?.createdAt ? (
                    <TruncatedText
                      text={formatAttributeValue(bizUser.createdAt, AttributeDataType.DateTime)}
                      className="flex-1 min-w-0 truncate"
                      rawValue={bizUser.createdAt}
                    />
                  ) : (
                    <span className="flex-1 min-w-0 truncate">-</span>
                  )}
                  <Button
                    variant={'ghost'}
                    size={'icon'}
                    className="w-6 h-6 rounded invisible group-hover:visible flex-shrink-0"
                    onClick={() => copyWithToast(bizUser?.createdAt || '')}
                  >
                    <CopyIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserProfile width={18} height={18} className="mr-2" />
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
                    className="group flex flex-row text-sm min-w-0 gap-2 border-b last:border-0"
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
                      className="w-6 h-6 m-2 rounded invisible group-hover:visible flex-shrink-0"
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

        {/* Right column - scrollable */}
        <div className="flex flex-col w-[800px]">
          {bizUser?.externalId && (
            <UserSessions environmentId={environmentId} externalUserId={bizUser?.externalId} />
          )}
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
