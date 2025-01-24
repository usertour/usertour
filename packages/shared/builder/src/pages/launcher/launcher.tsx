"use client";

import { BuilderMode, useBuilderContext } from "../../contexts";
import { LauncherBuilderEmbed } from "./components/launcher-embed";
import { LauncherCore } from "./launcher-core";
import { LauncherTarget } from "./launcher-target";
import { LauncherTooltip } from "./launcher-tooltip";

export const LauncherBuilder = () => {
  const { currentMode } = useBuilderContext();
  return (
    <>
      {currentMode.mode == BuilderMode.LAUNCHER && <LauncherCore />}
      {currentMode.mode == BuilderMode.LAUNCHER_TARGET && <LauncherTarget />}
      {currentMode.mode == BuilderMode.LAUNCHER_TOOLTIP && <LauncherTooltip />}
      <LauncherBuilderEmbed />
    </>
  );
};

LauncherBuilder.displayName = "LauncherBuilder";
