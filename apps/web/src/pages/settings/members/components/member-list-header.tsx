import { useMemberContext } from "@/contexts/member-context";
import { Button } from "@usertour-ui/button";
import { useState } from "react";
import { MemberInviteDialog } from "./member-invite-dialog";

export const MemberListHeader = () => {
  const [open, setOpen] = useState(false);
  const { refetch } = useMemberContext();
  const handleCreate = () => {
    setOpen(true);
  };
  const handleOnClose = () => {
    setOpen(false);
    refetch();
  };

  return (
    <>
      <div className="relative ">
        <div className="flex flex-col space-y-2">
          <div className="flex flex-row justify-between ">
            <h3 className="text-2xl font-semibold tracking-tight">Team</h3>
            <Button onClick={handleCreate} className="flex-none">
              Invite team member
            </Button>
          </div>
        </div>
      </div>
      <MemberInviteDialog isOpen={open} onClose={handleOnClose} />
    </>
  );
};

MemberListHeader.displayName = "MemberListHeader";
