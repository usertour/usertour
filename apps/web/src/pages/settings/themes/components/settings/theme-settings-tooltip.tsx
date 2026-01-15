import { useCallback, useMemo } from 'react';

import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import { MissingTooltipTargetBehavior } from '@usertour/types';

import { useThemeSettingsContext } from '../theme-settings-panel';

const MAX_TOLERANCE = 10;

export const ThemeSettingsTooltip = () => {
  const { settings, setSettings, isViewOnly } = useThemeSettingsContext();

  const update = useCallback(
    (data: Partial<typeof settings.tooltip>) => {
      const { tooltip } = settings;
      setSettings((pre) => ({
        ...pre,
        tooltip: { ...tooltip, ...data },
      }));
    },
    [settings, setSettings],
  );

  const toleranceError = useMemo(() => {
    const value = settings.tooltip?.missingTargetTolerance ?? 3;
    if (value > MAX_TOLERANCE) {
      return `Maximum value is ${MAX_TOLERANCE}`;
    }
    return undefined;
  }, [settings.tooltip?.missingTargetTolerance]);
  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingInput
          text="Width"
          name="tooltip-width"
          defaultValue={String(settings.tooltip.width)}
          onChange={(value: string) => {
            update({ width: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Notch size"
          name="tooltip-notch-size"
          defaultValue={String(settings.tooltip.notchSize)}
          onChange={(value: string) => {
            update({ notchSize: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Missing tooltip target tolerance"
          name="tooltip-missing-target-tolerance"
          defaultValue={String(settings.tooltip?.missingTargetTolerance ?? 3)}
          onChange={(value: string) => {
            update({ missingTargetTolerance: Number(value) });
          }}
          disabled={isViewOnly}
          unit="seconds"
          vertical
          tooltip="Specifies how long to wait for the target element to appear. If the element doesn't show up within this time, the 'Missing tooltip target behavior' setting below will be applied."
          error={toleranceError}
        />
        <ThemeSettingSelect
          text="Missing tooltip target behavior"
          name="tooltip-missing-target-behavior"
          defaultValue={
            settings.tooltip?.missingTargetBehavior ?? MissingTooltipTargetBehavior.AUTO_DISMISS
          }
          items={[
            { value: MissingTooltipTargetBehavior.AUTO_DISMISS, name: 'Auto-dismiss flow' },
            { value: MissingTooltipTargetBehavior.USE_BUBBLE, name: 'Use speech bubble instead' },
          ]}
          onValueChange={(value: string) => {
            update({ missingTargetBehavior: value as MissingTooltipTargetBehavior });
          }}
          disabled={isViewOnly}
          vertical
          tooltip="Determines the fallback action when the target element cannot be found within the tolerance time specified above."
        />
      </div>
    </div>
  );
};

ThemeSettingsTooltip.displayName = 'ThemeSettingsTooltip';
