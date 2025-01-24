import { Label } from "@usertour-ui/label";
import { Switch } from "@usertour-ui/switch";
import { LauncherTooltipSettings } from "@usertour-ui/types";
import { useState, useCallback } from "react";

type SettingItem = {
  id: keyof LauncherTooltipSettings;
  label: string;
  checked: (data: LauncherTooltipSettings) => boolean;
  onChange: (checked: boolean, update: UpdateFunction) => void;
};

const SETTING_ITEMS: readonly SettingItem[] = [
  {
    id: "dismissAfterFirstActivation",
    label: "Dismiss after first activation",
    checked: (data) => data.dismissAfterFirstActivation,
    onChange: (checked, update) =>
      update((pre) => ({ ...pre, dismissAfterFirstActivation: checked })),
  },
  // {
  //   id: "keepTooltipOpenWhenHovered",
  //   label: "Keep tooltip open when hovered over",
  //   checked: (data: LauncherTooltipSettings) => data.keepTooltipOpenWhenHovered,
  //   onChange: (checked: boolean, update: UpdateFunction) =>
  //     update((pre) => ({ ...pre, keepTooltipOpenWhenHovered: checked })),
  // },
  // {
  //   id: "hideLauncherWhenTooltipIsDisplayed",
  //   label: "Hide launcher while tooltip is displayed",
  //   checked: (data: LauncherTooltipSettings) =>
  //     data.hideLauncherWhenTooltipIsDisplayed,
  //   onChange: (checked: boolean, update: UpdateFunction) =>
  //     update((pre) => ({
  //       ...pre,
  //       hideLauncherWhenTooltipIsDisplayed: checked,
  //     })),
  // },
] as const;

type UpdateFunction = (
  fn: (pre: LauncherTooltipSettings) => LauncherTooltipSettings
) => void;

export interface LauncherSettingsProps {
  data: LauncherTooltipSettings;
  onChange: (value: LauncherTooltipSettings) => void;
}

/**
 * LauncherSettings component allows users to configure the behavior of the launcher
 * @param props - Component props
 * @param props.data - Initial settings data
 * @param props.type - Launcher type
 * @param props.onChange - Callback when settings change
 */
export const LauncherSettings = ({
  data: initialValue,
  onChange,
}: LauncherSettingsProps) => {
  const [data, setData] = useState<LauncherTooltipSettings>(initialValue);

  if (!initialValue) {
    return <div role="alert">Invalid settings data provided</div>;
  }

  const update = useCallback<UpdateFunction>(
    (fn) => {
      try {
        setData((pre) => {
          const v = fn(pre);
          onChange(v);
          return v;
        });
      } catch (error) {
        console.error("Failed to update settings:", error);
      }
    },
    [onChange]
  );

  return (
    <div className="space-y-3" role="group" aria-label="Launcher settings">
      <h1 className="text-sm">Settings</h1>
      <div className="flex flex-col bg-background-700 p-3.5 rounded-lg space-y-2">
        {SETTING_ITEMS.map((item) => {
          return (
            <div
              key={item.id}
              className="flex items-center justify-between space-x-2"
            >
              <Label htmlFor={item.id} className="font-normal">
                {item.label}
              </Label>
              <Switch
                id={item.id}
                className="data-[state=unchecked]:bg-input"
                checked={item.checked(data)}
                onCheckedChange={(checked) => item.onChange(checked, update)}
                aria-label={item.label}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

LauncherSettings.displayName = "LauncherSettings";
