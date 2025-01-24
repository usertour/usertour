"use client";

import {
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@usertour-ui/card";
import { Button } from "@usertour-ui/button";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { SpinnerIcon } from "@usertour-ui/icons";
import { ScrollArea } from "@usertour-ui/scroll-area";
import { useLauncherContext } from "../../contexts";
import { ContentAlignment } from "../../components/content-alignment";
import { LauncherPlacement } from "./components/launcher-placement";
import { SidebarContainer } from "../sidebar";

const LauncherTargetHeader = () => {
  const { backToLauncher, setLauncherTarget } = useLauncherContext();

  const handleBackToLauncher = () => {
    backToLauncher();
    setLauncherTarget(undefined);
  };

  return (
    <CardHeader className="flex-none p-4 space-y-2">
      <CardTitle className="flex flex-row space-x-1 text-base items-center">
        <Button
          variant="link"
          size="icon"
          onClick={handleBackToLauncher}
          className="text-foreground w-6 h-8"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </Button>
        <span className="truncate">Target settings</span>
      </CardTitle>
    </CardHeader>
  );
};

const LauncherTargetBody = () => {
  const { launcherTarget, setLauncherTarget } = useLauncherContext();

  if (!launcherTarget) {
    return null;
  }

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          <LauncherPlacement />
          <ContentAlignment
            initialValue={launcherTarget.alignment}
            onChange={(value) => {
              setLauncherTarget((prev) => {
                if (prev) {
                  return {
                    ...prev,
                    alignment: value,
                  };
                }
              });
            }}
          />
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const LauncherTargetFooter = () => {
  const {
    isLoading,
    launcherTarget,
    backToLauncher,
    updateLocalData,
    setLauncherTarget,
  } = useLauncherContext();

  const handleSave = () => {
    if (launcherTarget) {
      updateLocalData({ target: launcherTarget });
    }
    backToLauncher();
    setLauncherTarget(undefined);
  };

  return (
    <CardFooter className="flex-none p-5">
      <Button className="w-full h-10" disabled={isLoading} onClick={handleSave}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        Save
      </Button>
    </CardFooter>
  );
};

export const LauncherTarget = () => {
  return (
    <SidebarContainer>
      <LauncherTargetHeader />
      <LauncherTargetBody />
      <LauncherTargetFooter />
    </SidebarContainer>
  );
};

LauncherTarget.displayName = "LauncherTarget";
