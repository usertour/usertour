import { ChevronDownIcon, GearIcon } from "@radix-ui/react-icons";
import { EXTENSION_SELECT } from "@usertour-ui/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@usertour-ui/dropdown-menu";
import { ContentActions } from "@usertour-ui/shared-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@usertour-ui/tabs";
import { TooltipIcon } from "@usertour-ui/icons";
import { useAttributeListContext } from "@usertour-ui/contexts";
import { useBuilderContext, useLauncherContext } from "../../../contexts";
import { BuilderMode } from "../../../contexts";
import { useContentListContext } from "@usertour-ui/contexts";
import {
  ContentActionsItemType,
  LauncherActionType,
  LauncherBehaviorType,
  LauncherTriggerElement,
  LauncherTriggerEvent,
  RulesCondition,
} from "@usertour-ui/types";
import { useCallback } from "react";

interface TriggerDropdownProps {
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  zIndex: number;
  label?: string;
}

const TriggerDropdown = ({
  value,
  options,
  onChange,
  zIndex,
}: TriggerDropdownProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <div className="flex flex-row items-center space-x-2 text-sm text-primary cursor-pointer w-fit">
        <span>{value}</span>
        <ChevronDownIcon width={16} height={16} />
      </div>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="start"
      style={{ zIndex: zIndex + EXTENSION_SELECT }}
    >
      <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
        {options.map((option) => (
          <DropdownMenuRadioItem key={option.value} value={option.value}>
            {option.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);

const TRIGGER_ELEMENT_OPTIONS = [
  { value: LauncherTriggerElement.LAUNCHER, label: "Launcher" },
  { value: LauncherTriggerElement.TARGET, label: "Target element" },
  {
    value: LauncherTriggerElement.TARGET_OR_LAUNCHER,
    label: "Launcher or Target",
  },
] as const;

const TRIGGER_EVENT_OPTIONS = [
  { value: LauncherTriggerEvent.HOVERED, label: "hovered" },
  { value: LauncherTriggerEvent.CLICKED, label: "clicked" },
] as const;

export const LauncherBehavior = () => {
  const { setCurrentMode, zIndex, currentVersion } = useBuilderContext();
  const { contents } = useContentListContext();
  const { attributeList } = useAttributeListContext();
  const { localData, updateLocalDataBehavior, setLauncherTooltip } =
    useLauncherContext();

  const handleStateChange = useCallback(
    (key: keyof LauncherBehaviorType) => (value: string | RulesCondition[]) => {
      updateLocalDataBehavior({
        [key]: value,
      });
    },
    [updateLocalDataBehavior]
  );

  const handleSwitchToTooltip = useCallback(() => {
    if (!localData?.tooltip) return;

    setCurrentMode({ mode: BuilderMode.LAUNCHER_TOOLTIP });
    setLauncherTooltip(localData.tooltip);
  }, [localData?.tooltip, setCurrentMode, setLauncherTooltip]);

  if (!localData) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-sm">Behavior</h1>
      </div>
      <div className="flex flex-col bg-background-700 p-3.5 rounded-lg space-y-1">
        <div className="text-sm">When</div>
        <div className="flex flex-row space-x-1 items-center">
          <TriggerDropdown
            value={localData.behavior.triggerElement}
            options={TRIGGER_ELEMENT_OPTIONS}
            onChange={handleStateChange("triggerElement")}
            zIndex={zIndex}
          />
          <span className="text-sm">is</span>
          <TriggerDropdown
            value={localData.behavior.triggerEvent}
            options={TRIGGER_EVENT_OPTIONS}
            onChange={handleStateChange("triggerEvent")}
            zIndex={zIndex}
          />
        </div>
        <div className="text-sm">Then</div>
        <Tabs
          defaultValue={localData.behavior.actionType}
          onValueChange={handleStateChange("actionType")}
        >
          <TabsList className="grid w-full grid-cols-2 bg-background">
            <TabsTrigger
              value="show-tooltip"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Show tooltip
            </TabsTrigger>
            <TabsTrigger
              value="perform-action"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Perform action
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value={LauncherActionType.SHOW_TOOLTIP}
            className="bg-background p-2 rounded-lg "
          >
            <div
              className="flex flex-row items-center justify-between cursor-pointer h-8"
              onClick={handleSwitchToTooltip}
            >
              <div className="flex flex-row space-x-1 items-center">
                <TooltipIcon className="h-4 w-4 mt-1" />
                <span className="text-sm">Tooltip setting</span>
              </div>
              <GearIcon className="h-4 w-4" />
            </div>
          </TabsContent>
          <TabsContent
            value={LauncherActionType.PERFORM_ACTION}
            className="bg-background p-2 rounded-lg"
          >
            <ContentActions
              zIndex={zIndex + EXTENSION_SELECT}
              isShowIf={false}
              isShowLogic={false}
              currentStep={undefined}
              currentVersion={currentVersion}
              onDataChange={handleStateChange("actions")}
              defaultConditions={localData.behavior.actions}
              attributes={attributeList}
              contents={contents}
              filterItems={[
                ContentActionsItemType.LAUNCHER_DISMIS,
                ContentActionsItemType.JAVASCRIPT_EVALUATE,
                ContentActionsItemType.PAGE_NAVIGATE,
                ContentActionsItemType.FLOW_START,
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
LauncherBehavior.displayName = "LauncherBehavior";
