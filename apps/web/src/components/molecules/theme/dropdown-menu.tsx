import { BackIcon, UnPublishIcon } from "@usertour-ui/icons";
import { Separator } from "@usertour-ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@usertour-ui/dropdown-menu";
import { Button } from "@usertour-ui/button";
import { ChevronDownIcon } from "@radix-ui/react-icons";

export const DropdownMenuButton = () => {
  return (
    <Button>
      Push Updates
      <Separator orientation="vertical" className="h-[14px] mx-2" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ChevronDownIcon className="h-4 w-4 text-primary-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          alignOffset={-16}
          sideOffset={14}
          className="w-[160px]"
          forceMount
        >
          <DropdownMenuCheckboxItem className="pl-1 cursor-pointer">
            <BackIcon className="mr-1" width={14} height={14} />
            Discard Changes
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem className="pl-1 cursor-pointer">
            <UnPublishIcon className="mr-1" width={14} height={14} />
            Unpublish
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
        </DropdownMenuContent>
      </DropdownMenu>
    </Button>
  );
};

DropdownMenuButton.displayName = "DropdownMenuButton";
