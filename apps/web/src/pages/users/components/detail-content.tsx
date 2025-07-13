import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useUserListContext } from '@/contexts/user-list-context';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { UserIcon, UserProfile } from '@usertour-ui/icons';
import { AttributeBizTypes, BizUser } from '@usertour-ui/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserSessions } from './user-sessions';

interface UserDetailContentProps {
  environmentId: string;
  userId: string;
}

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
          <div className="px-4 py-6 shadow bg-white rounded-lg">
            <div className="mb-2 flex flex-row items-center font-bold	">
              <UserIcon width={18} height={18} className="mr-2" />
              User details
            </div>
            <div className="flex flex-col space-y-2 text-sm py-2">
              <div>ID: {bizUser?.externalId}</div>
              <div>createdAt: {bizUser?.createdAt}</div>
              <div>Email: {bizUser?.externalId}</div>
            </div>
          </div>
          <div className="px-4 py-6 shadow bg-white rounded-lg">
            <div className="mb-2 flex flex-row items-center font-bold	">
              <UserProfile width={18} height={18} className="mr-2" />
              User attributes
            </div>
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
          </div>
        </div>

        {/* Right column - scrollable */}
        <div className="flex flex-col w-[800px]">
          <div className="px-4 py-6 shadow bg-white rounded-lg">
            {bizUser?.externalId && (
              <UserSessions environmentId={environmentId} externalUserId={bizUser?.externalId} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

UserDetailContent.displayName = 'UserDetailContent';
