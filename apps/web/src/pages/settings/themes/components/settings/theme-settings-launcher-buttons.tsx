import { ThemeColorPicker } from '@/components/molecules/theme/theme-color-picker';
import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import { isNullish } from '@usertour/helpers';
import { ThemeTypesSettingsButton } from '@usertour/types';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { Switch } from '@usertour-packages/switch';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useThemeSettingsContext } from '../theme-settings-panel';

export const ThemeSettingsLauncherButtons = () => {
  const { settings, setSettings, finalSettings, isViewOnly } = useThemeSettingsContext();
  const [buttonData, setButtonData] = useState<ThemeTypesSettingsButton>(
    settings.launcherButtons.primary,
  );

  const updateBase = (data: Partial<typeof settings.launcherButtons>) => {
    const { launcherButtons } = settings;
    setSettings((pre) => ({
      ...pre,
      launcherButtons: { ...launcherButtons, ...data },
    }));
  };

  const updateButton = (data: Partial<ThemeTypesSettingsButton>) => {
    setButtonData((pre) => ({
      ...pre,
      ...data,
    }));
  };

  const handleBorderWidthChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (!value) {
        return;
      }
      updateButton({
        border: { ...buttonData.border, borderWidth: Number(value) },
      });
    },
    [buttonData],
  );

  useEffect(() => {
    if (buttonData) {
      setSettings((pre) => ({
        ...pre,
        launcherButtons: {
          ...pre.launcherButtons,
          primary: { ...pre.launcherButtons.primary, ...buttonData },
        },
      }));
    }
  }, [buttonData, setSettings]);

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingInput
          text="Height"
          name="launcher-button-height"
          defaultValue={String(settings.launcherButtons.height)}
          onChange={(value: string) => {
            updateBase({ height: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Width"
          name="launcher-button-width"
          disableUnit={isNullish(settings.launcherButtons.width)}
          placeholder="Auto"
          tooltip="By default, the button width adapts to its content. Set a value here for a fixed width."
          defaultValue={
            !isNullish(settings.launcherButtons.width) ? String(settings.launcherButtons.width) : ''
          }
          onChange={(value: string) => {
            const numValue = value === '' ? undefined : Number(value);
            updateBase({ width: numValue });
          }}
          disabled={isViewOnly}
          error={settings.launcherButtons.width === 0 ? 'Width cannot be 0' : undefined}
        />
        <ThemeSettingInput
          text="Border radius"
          name="launcher-button-border-radius"
          defaultValue={String(settings.launcherButtons.borderRadius)}
          onChange={(value: string) => {
            updateBase({ borderRadius: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingInput
          text="Horizontal padding"
          name="launcher-button-px"
          defaultValue={String(settings.launcherButtons.px ?? 4)}
          onChange={(value: string) => {
            updateBase({ px: Number(value) });
          }}
          disabled={isViewOnly}
        />
        <ThemeSettingSelect
          text="Font weight"
          defaultValue={String(buttonData.fontWeight)}
          onValueChange={(value: string) => {
            updateButton({ fontWeight: Number(value) });
          }}
          name="launcher-button-font-weight"
          disabled={isViewOnly}
        />
        <div className="flex flex-row w-full">
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Font color</div>
            <ThemeColorPicker
              defaultColor={buttonData.textColor.color}
              showAutoButton={true}
              isAutoColor={buttonData.textColor.color === 'Auto'}
              autoColor={finalSettings?.launcherButtons?.primary.textColor.color}
              onChange={(value: string) => {
                updateButton({ textColor: { ...buttonData.textColor, color: value } });
              }}
              className="rounded-r-none"
              disabled={isViewOnly}
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Hover</div>
            <ThemeColorPicker
              defaultColor={buttonData.textColor.hover}
              showAutoButton={true}
              isAutoColor={buttonData.textColor.hover === 'Auto'}
              autoColor={finalSettings?.launcherButtons?.primary.textColor.hover}
              onChange={(value: string) => {
                updateButton({ textColor: { ...buttonData.textColor, hover: value } });
              }}
              className="rounded-none border-x-0"
              disabled={isViewOnly}
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Click</div>
            <ThemeColorPicker
              defaultColor={buttonData.textColor.active}
              showAutoButton={true}
              isAutoColor={buttonData.textColor.active === 'Auto'}
              autoColor={settings.brandColor.color}
              onChange={(value: string) => {
                updateButton({ textColor: { ...buttonData.textColor, active: value } });
              }}
              className="rounded-l-none"
              disabled={isViewOnly}
            />
          </div>
        </div>
        <div className="flex flex-row w-full">
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Background</div>
            <ThemeColorPicker
              defaultColor={buttonData.backgroundColor.background}
              showAutoButton={true}
              isAutoColor={buttonData.backgroundColor.background === 'Auto'}
              autoColor={finalSettings?.launcherButtons?.primary.backgroundColor.background}
              onChange={(value: string) => {
                updateButton({
                  backgroundColor: { ...buttonData.backgroundColor, background: value },
                });
              }}
              className="rounded-r-none"
              disabled={isViewOnly}
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Hover</div>
            <ThemeColorPicker
              defaultColor={buttonData.backgroundColor.hover}
              showAutoButton={true}
              isAutoColor={buttonData.backgroundColor.hover === 'Auto'}
              autoColor={finalSettings?.launcherButtons?.primary.backgroundColor.hover}
              onChange={(value: string) => {
                updateButton({
                  backgroundColor: { ...buttonData.backgroundColor, hover: value },
                });
              }}
              className="rounded-none border-x-0"
              disabled={isViewOnly}
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Click</div>
            <ThemeColorPicker
              defaultColor={buttonData.backgroundColor.active}
              showAutoButton={true}
              isAutoColor={buttonData.backgroundColor.active === 'Auto'}
              autoColor={finalSettings?.launcherButtons?.primary.backgroundColor.active}
              onChange={(value: string) => {
                updateButton({
                  backgroundColor: { ...buttonData.backgroundColor, active: value },
                });
              }}
              className="rounded-l-none"
              disabled={isViewOnly}
            />
          </div>
        </div>

        <div className="flex flex-row items-center space-x-2 h-9">
          <Label htmlFor="launcher-button-border-switch" className="flex flex-col space-y-1">
            <span className="font-normal">Border</span>
          </Label>
          <Switch
            id="launcher-button-border-switch"
            checked={buttonData.border.enabled}
            className="data-[state=unchecked]:bg-input disabled:opacity-100"
            onCheckedChange={(checked: boolean) => {
              updateButton({
                border: { ...buttonData.border, enabled: checked },
              });
            }}
            disabled={isViewOnly}
          />
          {buttonData.border.enabled && (
            <div className="grow">
              <div className="ml-auto w-36 relative">
                <Input
                  type="text"
                  id="launcher-border-width"
                  name="Border width"
                  value={buttonData.border.borderWidth}
                  onChange={handleBorderWidthChange}
                  className="py-3 px-4 ps-4 pe-8 block w-full  shadow-sm rounded-lg text-sm disabled:opacity-100"
                  placeholder={''}
                  disabled={isViewOnly}
                />
                <div className="absolute inset-y-0 end-0 flex items-center pointer-events-none z-20 pe-4">
                  <span className="text-gray-500">px</span>
                </div>
              </div>
            </div>
          )}
        </div>
        {buttonData.border.enabled && (
          <div className="flex flex-row w-full">
            <div className="flex flex-col space-y-1 basis-1/3">
              <div className="text-sm">Border color</div>
              <ThemeColorPicker
                defaultColor={buttonData.border.color.color}
                showAutoButton={true}
                isAutoColor={buttonData.border.color.color === 'Auto'}
                autoColor={finalSettings?.launcherButtons?.primary.border.color.color}
                onChange={(value: string) => {
                  updateButton({
                    border: {
                      ...buttonData.border,
                      color: { ...buttonData.border.color, color: value },
                    },
                  });
                }}
                className="rounded-r-none"
                disabled={isViewOnly}
              />
            </div>
            <div className="flex flex-col space-y-1 basis-1/3">
              <div className="text-sm">Hover</div>
              <ThemeColorPicker
                defaultColor={buttonData.border.color.hover}
                showAutoButton={true}
                isAutoColor={buttonData.border.color.hover === 'Auto'}
                autoColor={finalSettings?.launcherButtons?.primary.border.color.hover}
                onChange={(value: string) => {
                  updateButton({
                    border: {
                      ...buttonData.border,
                      color: { ...buttonData.border.color, hover: value },
                    },
                  });
                }}
                className="rounded-none border-x-0"
                disabled={isViewOnly}
              />
            </div>
            <div className="flex flex-col space-y-1 basis-1/3">
              <div className="text-sm">Click</div>
              <ThemeColorPicker
                defaultColor={buttonData.border.color.active}
                showAutoButton={true}
                isAutoColor={buttonData.border.color.active === 'Auto'}
                autoColor={finalSettings?.launcherButtons?.primary.border.color.active}
                onChange={(value: string) => {
                  updateButton({
                    border: {
                      ...buttonData.border,
                      color: { ...buttonData.border.color, active: value },
                    },
                  });
                }}
                className="rounded-l-none"
                disabled={isViewOnly}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

ThemeSettingsLauncherButtons.displayName = 'ThemeSettingsLauncherButtons';
