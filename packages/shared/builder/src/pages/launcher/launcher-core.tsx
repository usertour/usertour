"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@usertour-ui/card";
import { ScrollArea } from "@usertour-ui/scroll-area";
import { useBuilderContext } from "../../contexts";
import { SidebarFooter } from "../sidebar/sidebar-footer";
import { SidebarHeader } from "../sidebar/sidebar-header";
import { SidebarTheme } from "../sidebar/sidebar-theme";
import { LauncherType } from "./components/launcher-type";
import { LauncherBehavior } from "./components/launcher-behavior";
import { LauncherTargetPreview } from "./components/launcher-target-preview";
import { SidebarContainer } from "../sidebar";
import { LauncherZIndex } from "./components/launcher-zindex";

const LauncherCoreBody = () => {
  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full ">
        <div className="flex-col space-y-3 p-4">
          <SidebarTheme />
          <LauncherType />
          <LauncherZIndex />
          <LauncherTargetPreview />
          <LauncherBehavior />
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const LauncherCoreHeader = () => {
  const { currentContent } = useBuilderContext();
  return (
    <CardHeader className="flex-none p-4 space-y-3">
      <CardTitle className="flex h-8	">
        <SidebarHeader title={currentContent?.name ?? ""} />
      </CardTitle>
    </CardHeader>
  );
};

const LauncherCoreFooter = () => {
  return (
    <CardFooter className="flex p-5">
      <SidebarFooter />
    </CardFooter>
  );
};

export const LauncherCore = () => {
  return (
    <SidebarContainer>
      <LauncherCoreHeader />
      <LauncherCoreBody />
      <LauncherCoreFooter />
    </SidebarContainer>
  );
};

LauncherCore.displayName = "LauncherCore";
