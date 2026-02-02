import { ColorPicker } from '@usertour-packages/shared-components';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import { ThemeTypesSetting, ThemeTypesSettingsButton } from '@usertour/types';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { Switch } from '@usertour-packages/switch';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { generateStateColors } from '@usertour/helpers';
import { useThemeSettingsContext } from '../theme-settings-panel';

type ThemeSettingsButtonProps = {
  text: string;
  name: 'primary' | 'secondary';
};

type ButtonName = ThemeSettingsButtonProps['name'];

type UpdatePayload =
  | Partial<ThemeTypesSettingsButton>
  | ((prev: ThemeTypesSettingsButton) => Partial<ThemeTypesSettingsButton>);

function applyTextColorChange(
  prev: ThemeTypesSettingsButton,
  value: string,
  name: ButtonName,
  finalSettings: ThemeTypesSetting | null,
): Partial<ThemeTypesSettingsButton> {
  const resolvedTextColor =
    value !== 'Auto'
      ? value
      : name === 'primary'
        ? finalSettings?.brandColor.color
        : finalSettings?.brandColor.background;
  return {
    textColor: {
      ...prev.textColor,
      color: value,
      ...(resolvedTextColor != null && {
        autoHover: resolvedTextColor,
        autoActive: resolvedTextColor,
      }),
    },
  };
}

function applyBackgroundColorChange(
  prev: ThemeTypesSettingsButton,
  value: string,
  name: ButtonName,
  finalSettings: ThemeTypesSetting | null,
): Partial<ThemeTypesSettingsButton> {
  const resolvedBg =
    value !== 'Auto'
      ? value
      : name === 'primary'
        ? finalSettings?.brandColor.background
        : finalSettings?.mainColor.background;
  const accent =
    name === 'primary' ? finalSettings?.brandColor.color : finalSettings?.brandColor.background;
  const stateColors =
    resolvedBg != null && accent != null ? generateStateColors(resolvedBg, accent) : null;
  return {
    backgroundColor: {
      ...prev.backgroundColor,
      background: value,
      ...(stateColors != null && {
        autoHover: stateColors.hover,
        autoActive: stateColors.active,
      }),
    },
  };
}

function applyBorderColorChange(
  prev: ThemeTypesSettingsButton,
  value: string,
  name: ButtonName,
  finalSettings: ThemeTypesSetting | null,
): Partial<ThemeTypesSettingsButton> {
  const resolvedBorderColor =
    value !== 'Auto'
      ? value
      : (finalSettings?.buttons[name].border.color.color ?? finalSettings?.brandColor.background);
  if (name === 'primary') {
    const accent = finalSettings?.brandColor.color;
    const stateColors =
      resolvedBorderColor != null && accent != null
        ? generateStateColors(resolvedBorderColor, accent)
        : null;
    return {
      border: {
        ...prev.border,
        color: {
          ...prev.border.color,
          color: value,
          ...(stateColors != null && {
            autoHover: stateColors.hover,
            autoActive: stateColors.active,
          }),
        },
      },
    };
  }
  return {
    border: {
      ...prev.border,
      color: {
        ...prev.border.color,
        color: value,
        ...(resolvedBorderColor != null && {
          autoHover: resolvedBorderColor,
          autoActive: resolvedBorderColor,
        }),
      },
    },
  };
}

export const ThemeSettingsButton = (props: ThemeSettingsButtonProps) => {
  const { text, name } = props;
  const { settings, setSettings, finalSettings, isViewOnly } = useThemeSettingsContext();
  const [data, setData] = useState<ThemeTypesSettingsButton>(settings.buttons[name]);

  const update = useCallback((payload: UpdatePayload) => {
    setData((pre) => {
      const next = typeof payload === 'function' ? payload(pre) : payload;
      return { ...pre, ...next };
    });
  }, []);

  const handleBorderWidthChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (!value) {
        return;
      }
      update((prev) => ({
        border: { ...prev.border, borderWidth: Number(value) },
      }));
    },
    [update],
  );

  useEffect(() => {
    if (data) {
      const { buttons } = settings;
      setSettings((pre) => ({
        ...pre,
        buttons: { ...buttons, [name]: { ...buttons[name], ...data } },
      }));
    }
  }, [data, name]);

  return (
    <div className="py-[15px] px-5 space-y-3">
      <div className="text-base">{text}</div>
      <ThemeSettingSelect
        text="Font weight"
        defaultValue={String(data.fontWeight)}
        onValueChange={(value: string) => update({ fontWeight: Number(value) })}
        name="fong-weight"
        disabled={isViewOnly}
      />
      <div className="flex flex-row w-full">
        <div className="flex flex-col space-y-1 basis-1/3">
          <div className="text-sm">Font color</div>
          <ColorPicker
            defaultColor={data.textColor.color}
            showAutoButton={true}
            isAutoColor={data.textColor.color === 'Auto'}
            autoColor={finalSettings?.buttons[name].textColor.color}
            onChange={(value: string) =>
              update((prev) => applyTextColorChange(prev, value, name, finalSettings))
            }
            className="rounded-r-none"
            disabled={isViewOnly}
          />
        </div>
        <div className="flex flex-col space-y-1 basis-1/3">
          <div className="text-sm">Hover</div>
          <ColorPicker
            defaultColor={data.textColor.hover}
            showAutoButton={true}
            isAutoColor={data.textColor.hover === 'Auto'}
            autoColor={finalSettings?.buttons[name].textColor.hover}
            onChange={(value: string) =>
              update((prev) => ({
                textColor: { ...prev.textColor, hover: value },
              }))
            }
            className="rounded-none border-x-0"
            disabled={isViewOnly}
          />
        </div>
        <div className="flex flex-col space-y-1 basis-1/3">
          <div className="text-sm">Click</div>
          <ColorPicker
            defaultColor={data.textColor.active}
            showAutoButton={true}
            isAutoColor={data.textColor.active === 'Auto'}
            autoColor={finalSettings?.buttons[name].textColor.active}
            onChange={(value: string) =>
              update((prev) => ({
                textColor: { ...prev.textColor, active: value },
              }))
            }
            className="rounded-l-none"
            disabled={isViewOnly}
          />
        </div>
      </div>
      <div className="flex flex-row w-full">
        <div className="flex flex-col space-y-1 basis-1/3">
          <div className="text-sm">Background</div>
          <ColorPicker
            defaultColor={data.backgroundColor.background}
            showAutoButton={true}
            isAutoColor={data.backgroundColor.background === 'Auto'}
            autoColor={finalSettings?.buttons[name].backgroundColor.background}
            onChange={(value: string) =>
              update((prev) => applyBackgroundColorChange(prev, value, name, finalSettings))
            }
            className="rounded-r-none"
            disabled={isViewOnly}
          />
        </div>
        <div className="flex flex-col space-y-1 basis-1/3">
          <div className="text-sm">Hover</div>
          <ColorPicker
            defaultColor={data.backgroundColor.hover}
            showAutoButton={true}
            isAutoColor={data.backgroundColor.hover === 'Auto'}
            autoColor={finalSettings?.buttons[name].backgroundColor.hover}
            onChange={(value: string) =>
              update((prev) => ({
                backgroundColor: { ...prev.backgroundColor, hover: value },
              }))
            }
            className="rounded-none border-x-0"
            disabled={isViewOnly}
          />
        </div>
        <div className="flex flex-col space-y-1 basis-1/3">
          <div className="text-sm">Click</div>
          <ColorPicker
            defaultColor={data.backgroundColor.active}
            showAutoButton={true}
            isAutoColor={data.backgroundColor.active === 'Auto'}
            autoColor={finalSettings?.buttons[name].backgroundColor.active}
            onChange={(value: string) =>
              update((prev) => ({
                backgroundColor: { ...prev.backgroundColor, active: value },
              }))
            }
            className="rounded-l-none"
            disabled={isViewOnly}
          />
        </div>
      </div>

      <div className="flex flex-row items-center space-x-2 h-9">
        <Label htmlFor={`${name}-button-border-switch`} className="flex flex-col space-y-1">
          <span className="font-normal">Border</span>
        </Label>
        <Switch
          id="border-switch"
          checked={data.border.enabled}
          className="data-[state=unchecked]:bg-input disabled:opacity-100"
          onCheckedChange={(checked: boolean) =>
            update((prev) => ({
              border: { ...prev.border, enabled: checked },
            }))
          }
          disabled={isViewOnly}
        />
        {data.border.enabled && (
          <div className="grow">
            <div className="ml-auto w-36 relative">
              <Input
                type="text"
                id={'border-width'}
                name={'Border width'}
                value={data.border.borderWidth}
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
      {data.border.enabled && (
        <div className="flex flex-row w-full">
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Border color</div>
            <ColorPicker
              defaultColor={data.border.color.color}
              showAutoButton={true}
              isAutoColor={data.border.color.color === 'Auto'}
              autoColor={finalSettings?.buttons[name].border.color.color}
              onChange={(value: string) =>
                update((prev) => applyBorderColorChange(prev, value, name, finalSettings))
              }
              className="rounded-r-none"
              disabled={isViewOnly}
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Hover</div>
            <ColorPicker
              defaultColor={data.border.color.hover}
              showAutoButton={true}
              isAutoColor={data.border.color.hover === 'Auto'}
              autoColor={finalSettings?.buttons[name].border.color.hover}
              onChange={(value: string) =>
                update((prev) => ({
                  border: {
                    ...prev.border,
                    color: { ...prev.border.color, hover: value },
                  },
                }))
              }
              className="rounded-none border-x-0"
              disabled={isViewOnly}
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Click</div>
            <ColorPicker
              defaultColor={data.border.color.active}
              showAutoButton={true}
              isAutoColor={data.border.color.active === 'Auto'}
              autoColor={finalSettings?.buttons[name].border.color.active}
              onChange={(value: string) =>
                update((prev) => ({
                  border: {
                    ...prev.border,
                    color: { ...prev.border.color, active: value },
                  },
                }))
              }
              className="rounded-l-none"
              disabled={isViewOnly}
            />
          </div>
        </div>
      )}
    </div>
  );
};

ThemeSettingsButton.displayName = 'ThemeSettingsButton';
