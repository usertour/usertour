import { ChevronDownIcon } from '@radix-ui/react-icons';
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
} from '@usertour/ui';
import { BackIcon, UnPublishIcon } from '@usertour/icons';
import { useTranslation } from 'react-i18next';

export const DropdownMenuButton = () => {
  const { t } = useTranslation();
  return (
    <Button>
      {t('themes.dropdownMenu.pushUpdates')}
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
            {t('themes.dropdownMenu.discardChanges')}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem className="pl-1 cursor-pointer">
            <UnPublishIcon className="mr-1" width={14} height={14} />
            {t('themes.dropdownMenu.unpublish')}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
        </DropdownMenuContent>
      </DropdownMenu>
    </Button>
  );
};

DropdownMenuButton.displayName = 'DropdownMenuButton';
