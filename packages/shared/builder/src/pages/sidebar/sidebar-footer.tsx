import { ExitIcon } from "@radix-ui/react-icons";
import { Button } from "@usertour-ui/button";
import { CheckedIcon, SpinnerIcon } from "@usertour-ui/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@usertour-ui/tooltip";

import { useBuilderContext } from "../../contexts";

export const SidebarFooter = () => {
  const { saveContent, isLoading, onSaved } = useBuilderContext();
  const handleSaveStep = async () => {
    await saveContent();
    if (onSaved) {
      return await onSaved();
    }
  };

  return (
    <>
      <div className="flex-none relative mr-8 ml-4">
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <CheckedIcon
                  className="text-green-500"
                  width={20}
                  height={20}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Saved</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Button
        className="grow w-full h-10"
        onClick={handleSaveStep}
        disabled={isLoading}
      >
        <ExitIcon className="mr-2"></ExitIcon>Save preferences
      </Button>
    </>
  );
};
SidebarFooter.displayName = "SidebarFooter";
