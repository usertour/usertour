import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { BackIcon, UnPublishIcon } from '@usertour-packages/icons';
import { Separator } from '@usertour-packages/separator';

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

DropdownMenuButton.displayName = 'DropdownMenuButton';
