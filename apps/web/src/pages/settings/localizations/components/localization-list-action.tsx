import { Button } from "@usertour-ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@usertour-ui/dropdown-menu";
import { DotsHorizontalIcon, StarFilledIcon } from "@radix-ui/react-icons";
import { LocalizationEditForm } from "./localization-edit-form";
import { useLocalizationListContext } from "@/contexts/localization-list-context";
import { useState } from "react";
import { LocalizationDeleteForm } from "./localization-delete-form";
import { CloseIcon, EditIcon } from "@usertour-ui/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@usertour-ui/tooltip";
import { Localization } from "@usertour-ui/types";
import { useMutation } from "@apollo/client";
import { setDefaultLocalization } from "@usertour-ui/gql";
import { useToast } from "@usertour-ui/use-toast";
import { getErrorMessage } from "@usertour-ui/shared-utils";

type LocalizationListActionProps = {
  localization: Localization;
};
export const LocalizationListAction = (props: LocalizationListActionProps) => {
  const { localization } = props;
  const [open, setOpen] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const { refetch } = useLocalizationListContext();
  const [setDefaultMutation] = useMutation(setDefaultLocalization);
  const { toast } = useToast();
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

  const handleSetAsDefault = async () => {
    try {
      await setDefaultMutation({
        variables: {
          id: localization.id,
        },
      });
      await refetch();
      // onSubmit("setAsDefault");
      toast({
        variant: "success",
        title: "The localization has been successfully set as default",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: getErrorMessage(error),
      });
    }
  };

  return (
    <>
      {
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
              Edit localization
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSetAsDefault}
              disabled={localization.isDefault}
            >
              <StarFilledIcon className="mr-1" width={15} height={15} />
              Set as company default
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      <LocalizationEditForm
        localization={localization}
        isOpen={open}
        onClose={handleOnClose}
      />
      <LocalizationDeleteForm
        data={localization}
        open={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        onSubmit={handleDeleteClose}
      />
    </>
  );
};

LocalizationListAction.displayName = "LocalizationListAction";
