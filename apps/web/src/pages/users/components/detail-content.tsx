import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useUserListContext } from '@/contexts/user-list-context';
import { useEventListContext } from '@/contexts/event-list-context';
import { ArrowLeftIcon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import { UserIcon, UserProfile, Delete2Icon } from '@usertour-ui/icons';
import { AttributeBizTypes, BizUser } from '@usertour-ui/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserSessions } from './user-sessions';
import { formatDistanceToNow } from 'date-fns';
import { IdCardIcon, EnvelopeClosedIcon, CalendarIcon, PersonIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-ui/card';
import { Button } from '@usertour-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { BizUserDeleteForm } from './bizuser-delete-form';
import { ContentLoading } from '@/components/molecules/content-loading';
import { TruncatedText } from '@/components/molecules/truncated-text';

interface UserDetailContentProps {
  environmentId: string;
  userId: string;
}

// TooltipIcon component to reduce repetitive code
const TooltipIcon = ({
  icon: Icon,
  tooltip,
  className = 'w-4 h-4 text-foreground/60 cursor-help',
}: {
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  className?: string;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Icon className={className} />
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

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
          });
        }
      }
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
        <p className="text-muted-foreground text-center">User not found.</p>
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
          <span>User Detail</span>
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
                  className="text-destructive focus:text-destructive"
                >
                  <Delete2Icon className="mr-2 h-4 w-4" />
                  Delete User
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
                User details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 gap-x-12 ">
                <div className="flex items-center space-x-2">
                  <TooltipIcon icon={IdCardIcon} tooltip="User ID" />
                  <TruncatedText text={bizUser?.externalId || ''} maxLength={15} />
                </div>
                <div className="flex items-center space-x-2">
                  <TooltipIcon icon={EnvelopeClosedIcon} tooltip="Email" />
                  <TruncatedText text={bizUser?.data?.email || ''} maxLength={15} />
                </div>
                <div className="flex items-center space-x-2">
                  <TooltipIcon icon={PersonIcon} tooltip="Name" />
                  <TruncatedText text={bizUser?.data?.name || 'Unnamed user'} maxLength={15} />
                </div>
                <div className="flex items-center space-x-2">
                  <TooltipIcon icon={CalendarIcon} tooltip="Created" />
                  <span>
                    {bizUser?.createdAt && formatDistanceToNow(new Date(bizUser?.createdAt))} ago
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserProfile width={18} height={18} className="mr-2" />
                User attributes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-row border-b py-2 text-sm opacity-80">
                <div className="w-1/2 ">Name</div>
                <div className="w-1/2 ">Value</div>
              </div>
              {bizUserAttributes.map(({ name, value }, key) => (
                <div className="flex flex-row py-2 text-sm" key={key}>
                  <div className="w-1/2">
                    <TruncatedText text={name} maxLength={15} />
                  </div>
                  <div className="w-1/2">
                    <TruncatedText text={`${value}`} maxLength={25} />
                  </div>
                </div>
              ))}
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
      <BizUserDeleteForm
        bizUserIds={bizUser ? [bizUser.id] : []}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onSubmit={handleDeleteSuccess}
      />
    </>
  );
};

// Main export component
export function UserDetailContent(props: UserDetailContentProps) {
  return <UserDetailContentWithLoading {...props} />;
}

UserDetailContent.displayName = 'UserDetailContent';
