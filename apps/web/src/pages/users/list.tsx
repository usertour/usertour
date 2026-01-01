import { useAppContext } from '@/contexts/app-context';
import { SegmentListProvider } from '@/contexts/segment-list-context';
import { UserListSidebar, UserListContent } from './components/layout';
import { ScrollArea } from '@usertour-packages/scroll-area';

export const UserList = () => {
  const { environment } = useAppContext();

  if (!environment?.id) {
    return null;
  }

  return (
    <SegmentListProvider environmentId={environment.id} bizType={['USER']}>
      <UserListSidebar environmentId={environment.id} />
      <ScrollArea className="h-full w-full ">
        <UserListContent environmentId={environment.id} />
      </ScrollArea>
    </SegmentListProvider>
  );
};

UserList.displayName = 'UserList';
