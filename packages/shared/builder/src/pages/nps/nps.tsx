"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@usertour-ui/card";
import { EXTENSION_SIDEBAR_MAIN } from "@usertour-ui/constants";
import { ScrollArea } from "@usertour-ui/scroll-area";
import { cn } from "@usertour-ui/ui-utils";
import { useRef } from "react";
import { BuilderMode, useBuilderContext } from "../../contexts";
import { SidebarFooter } from "../sidebar/sidebar-footer";
import { SidebarHeader } from "../sidebar/sidebar-header";
import { SidebarMini } from "../sidebar/sidebar-mini";
import { SidebarTheme } from "../sidebar/sidebar-theme";
import {
  useAttributeListContext,
  useContentListContext,
} from "@usertour-ui/contexts";

const NpsBuilderBody = () => {
  const { setCurrentMode, zIndex, currentVersion } = useBuilderContext();
  const { contents } = useContentListContext();
  const { attributeList } = useAttributeListContext();

  const handleContentTypeChange = (type: string) => {
    //
  };

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full ">
        <div className="flex-col space-y-3 p-4">
          <SidebarTheme />
          Nps
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const NpsBuilderHeader = () => {
  const { currentContent } = useBuilderContext();
  return (
    <CardHeader className="flex-none p-4 space-y-3">
      <CardTitle className="flex h-8	">
        <SidebarHeader title={currentContent?.name ?? ""} />
      </CardTitle>
    </CardHeader>
  );
};

const NpsBuilderFooter = () => {
  return (
    <CardFooter className="flex p-5">
      <SidebarFooter />
    </CardFooter>
  );
};

export const NpsBuilder = () => {
  const { position, zIndex } = useBuilderContext();
  const sidbarRef = useRef<HTMLDivElement | null>(null);
  return (
    <>
      <div
        style={{ zIndex: zIndex + EXTENSION_SIDEBAR_MAIN }}
        className={cn(
          "w-80 h-screen p-2 fixed top-0",
          position == "left" ? "left-0" : "right-0"
        )}
        ref={sidbarRef}
      >
        <SidebarMini container={sidbarRef} />
        <Card className="h-full flex flex-col bg-background-800">
          <NpsBuilderHeader />
          <NpsBuilderBody />
          <NpsBuilderFooter />
        </Card>
      </div>
    </>
  );
};

NpsBuilder.displayName = "NpsBuilder";
