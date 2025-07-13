import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useUserListContext } from '@/contexts/user-list-context';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { UserIcon, UserProfile } from '@usertour-ui/icons';
import { AttributeBizTypes, BizUser } from '@usertour-ui/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserSessions } from './user-sessions';
import { formatDistanceToNow } from 'date-fns';
import { IdCardIcon, EnvelopeClosedIcon, CalendarIcon, PersonIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-ui/card';

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

export function UserDetailContent(props: UserDetailContentProps) {
  const { environmentId, userId } = props;
  const navigator = useNavigate();
  const { bizUserList } = useUserListContext();
  const [bizUser, setBizUser] = useState<BizUser>();
  const [bizUserAttributes, setBizUserAttributes] = useState<any[]>([]);
  const { attributeList } = useAttributeListContext();

  useEffect(() => {
    if (!bizUserList) {
      return;
    }
    const { edges, pageInfo } = bizUserList;
    if (!edges || !pageInfo) {
      return;
    }
    const user = edges.find((c: any) => c.node.id === userId);
    if (user?.node) {
      setBizUser(user.node);
    }
  }, [bizUserList, userId]);

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

  return (
    <>
      <div className="border-b bg-white flex-col md:flex w-full fixed">
        <div className="flex h-16 items-center px-4">
          <ArrowLeftIcon
            className="ml-4 h-6 w-8 cursor-pointer"
            onClick={() => {
              navigator(`/env/${environmentId}/users`);
            }}
          />
          <span>{bizUser?.externalId}</span>
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
                  <span>{bizUser?.externalId}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TooltipIcon icon={EnvelopeClosedIcon} tooltip="Email" />
                  <span>{bizUser?.data?.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TooltipIcon icon={PersonIcon} tooltip="Name" />
                  <span>{bizUser?.data?.name || 'Unnamed user'}</span>
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
                  <div className="w-1/2">{name}</div>
                  <div className="w-1/2">{`${value}`}</div>
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
    </>
  );
}

UserDetailContent.displayName = 'UserDetailContent';
