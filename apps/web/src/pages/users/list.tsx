import { UserListSidebar } from "@/pages/users/components/sidebar";
import { SegmentListProvider } from "@/contexts/segment-list-context";
import { UserListContent } from "./components/content";
import { useAppContext } from "@/contexts/app-context";
import { ScrollArea } from "@usertour-ui/scroll-area";

export const UserList = () => {
  const { environment } = useAppContext();

  return (
    <SegmentListProvider environmentId={environment?.id} bizType={["USER"]}>
      <UserListSidebar />
      <ScrollArea className="h-full w-full ">
        <UserListContent environmentId={environment?.id} />
      </ScrollArea>
    </SegmentListProvider>
  );
};

UserList.displayName = "UserList";
