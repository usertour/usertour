import { useState } from "react";
import { EnvironmentCreateForm } from "./environment-create-form";
import { Button } from "@usertour-ui/button";
import { useEnvironmentListContext } from "@/contexts/environment-list-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@usertour-ui/tooltip";
import { InfoCircledIcon, OpenInNewWindowIcon } from "@radix-ui/react-icons";

export const EnvironmentListHeader = () => {
  const [open, setOpen] = useState(false);
  const { refetch } = useEnvironmentListContext();
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
            <h3 className="text-2xl font-semibold tracking-tight">
              Environments
            </h3>
            <Button onClick={handleCreate} className="flex-none">
              New Environment
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>
              With environments, you can isolate user/company/content data
              between e.g. Production and Staging.
            </p>
            <p>
              <a
                href="https://www.usertour.io/docs/how-to-guides/environments/"
                className="text-primary  "
                target="_blank"
              >
                <span>Read the Environments guide</span>
                <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
              </a>
            </p>
          </div>
        </div>
      </div>
      <EnvironmentCreateForm isOpen={open} onClose={handleOnClose} />
    </>
  );
};

EnvironmentListHeader.displayName = "EnvironmentListHeader";
