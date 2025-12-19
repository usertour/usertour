import { ExitIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { CheckedIcon, SpinnerIcon } from '@usertour-packages/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';

export interface SidebarFooterProps {
  onSave: () => Promise<void>;
  isLoading?: boolean;
}

export const SidebarFooter = ({ onSave, isLoading = false }: SidebarFooterProps) => {
  return (
    <>
      <div className="flex-none relative mr-8 ml-4">
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <CheckedIcon className="text-green-500" width={20} height={20} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Saved</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Button className="grow w-full h-10" onClick={onSave} disabled={isLoading}>
        <ExitIcon className="mr-2" />
        Save preferences
      </Button>
    </>
  );
};
SidebarFooter.displayName = 'SidebarFooter';
