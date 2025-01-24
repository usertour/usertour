import { useParams } from "react-router-dom";
import { UserListProvider } from "@/contexts/user-list-context";
import { UserDetailContent } from "./components/detail-content";
import { useAppContext } from "@/contexts/app-context";

export const UserDetail = () => {
  const { userId } = useParams();
  const { environment } = useAppContext();
  return (
    <UserListProvider
      environmentId={environment?.id}
      defaultQuery={{ userId: userId }}
    >
      {environment?.id && userId && (
        <UserDetailContent environmentId={environment?.id} userId={userId} />
      )}
    </UserListProvider>
  );
};

UserDetail.displayName = "UserDetail";
