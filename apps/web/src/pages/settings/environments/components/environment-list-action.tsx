import { Button } from "@usertour-ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@usertour-ui/dropdown-menu";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Environment } from "@/types/project";
import { EnvironmentEditForm } from "./environment-edit-form";
import { useEnvironmentListContext } from "@/contexts/environment-list-context";
import { useState } from "react";
import { EnvironmentDeleteForm } from "./environment-delete-form";
import { CloseIcon, EditIcon } from "@usertour-ui/icons";

type EnvironmentListActionProps = {
  environment: Environment;
};
export const EnvironmentListAction = (props: EnvironmentListActionProps) => {
  const { environment } = props;
  const [open, setOpen] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const { refetch } = useEnvironmentListContext();
  const handleOpen = () => {
    setOpen(true);
  };
  const handleOnClose = () => {
    setOpen(false);
    refetch();
  };
  const handleDeleteOpen = () => {
    setOpenDeleteDialog(true);
  };
  const handleDeleteClose = () => {
    setOpenDeleteDialog(false);
    refetch();
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuItem onClick={handleOpen}>
            <EditIcon className="w-6" width={12} height={12} />
            Rename environment
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDeleteOpen}>
            <CloseIcon className="w-6" width={16} height={16} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EnvironmentEditForm
        environment={environment}
        isOpen={open}
        onClose={handleOnClose}
      />
      <EnvironmentDeleteForm
        data={environment}
        open={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        onSubmit={handleDeleteClose}
      />
    </>
  );
};

EnvironmentListAction.displayName = "EnvironmentListAction";
