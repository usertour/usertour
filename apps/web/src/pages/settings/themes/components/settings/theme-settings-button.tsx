import { ThemeColorPicker } from '@/components/molecules/theme/theme-color-picker';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import { ThemeTypesSettingsButton } from '@/types/theme-settings';
import { Input } from '@usertour-ui/input';
import { Label } from '@usertour-ui/label';
import { Switch } from '@usertour-ui/switch';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useThemeSettingsContext } from '.';

type ThemeSettingsButtonProps = {
  text: string;
  name: 'primary' | 'secondary';
};
export const ThemeSettingsButton = (props: ThemeSettingsButtonProps) => {
  const { text, name } = props;
  const { settings, setSettings, finalSettings } = useThemeSettingsContext();
  const [data, setData] = useState<ThemeTypesSettingsButton>(settings.buttons[name]);

  const update = (data: Partial<ThemeTypesSettingsButton>) => {
    setData((pre) => ({
      ...pre,
      ...data,
    }));
  };

  const handleOnChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (!value) {
        return;
      }
      update({
        border: { ...data.border, borderWidth: Number(value) },
      });
    },
    [data],
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
        onValueChange={(value: string) => {
          update({ fontWeight: Number(value) });
        }}
        name="fong-weight"
      />
      <div className="flex flex-row w-full">
        <div className="flex flex-col space-y-1 basis-1/3">
          <div className="text-sm">Font color</div>
          <ThemeColorPicker
            defaultColor={data.textColor.color}
            showAutoButton={true}
            isAutoColor={data.textColor.color === 'Auto'}
            autoColor={finalSettings?.buttons[name].textColor.color}
            onChange={(value: string) => {
              update({ textColor: { ...data.textColor, color: value } });
            }}
            className="rounded-r-none"
          />
        </div>
        <div className="flex flex-col space-y-1 basis-1/3">
          <div className="text-sm">Hover</div>
          <ThemeColorPicker
            defaultColor={data.textColor.hover}
            showAutoButton={true}
            isAutoColor={data.textColor.hover === 'Auto'}
            autoColor={finalSettings?.buttons[name].textColor.hover}
            onChange={(value: string) => {
              update({ textColor: { ...data.textColor, hover: value } });
            }}
            className="rounded-none border-x-0"
          />
        </div>
        <div className="flex flex-col space-y-1 basis-1/3">
          <div className="text-sm">Click</div>
          <ThemeColorPicker
            defaultColor={data.textColor.active}
            showAutoButton={true}
            isAutoColor={data.textColor.active === 'Auto'}
            autoColor={
              name === 'primary' ? settings.brandColor.color : settings.brandColor.background
            }
            onChange={(value: string) => {
              update({ textColor: { ...data.textColor, active: value } });
            }}
            className="rounded-l-none"
          />
        </div>
      </div>
      <div className="flex flex-row w-full">
        <div className="flex flex-col space-y-1 basis-1/3">
          <div className="text-sm">Background</div>
          <ThemeColorPicker
            defaultColor={data.backgroundColor.background}
            showAutoButton={true}
            isAutoColor={data.backgroundColor.background === 'Auto'}
            autoColor={finalSettings?.buttons[name].backgroundColor.background}
            onChange={(value: string) => {
              update({
                backgroundColor: { ...data.backgroundColor, background: value },
              });
            }}
            className="rounded-r-none"
          />
        </div>
        <div className="flex flex-col space-y-1 basis-1/3">
          <div className="text-sm">Hover</div>
          <ThemeColorPicker
            defaultColor={data.backgroundColor.hover}
            showAutoButton={true}
            isAutoColor={data.backgroundColor.hover === 'Auto'}
            autoColor={finalSettings?.buttons[name].backgroundColor.hover}
            onChange={(value: string) => {
              update({
                backgroundColor: { ...data.backgroundColor, hover: value },
              });
            }}
            className="rounded-none border-x-0"
          />
        </div>
        <div className="flex flex-col space-y-1 basis-1/3">
          <div className="text-sm">Click</div>
          <ThemeColorPicker
            defaultColor={data.backgroundColor.active}
            showAutoButton={true}
            isAutoColor={data.backgroundColor.active === 'Auto'}
            autoColor={finalSettings?.buttons[name].backgroundColor.active}
            onChange={(value: string) => {
              update({
                backgroundColor: { ...data.backgroundColor, active: value },
              });
            }}
            className="rounded-l-none"
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
          className="data-[state=unchecked]:bg-input"
          onCheckedChange={(checked: boolean) => {
            update({
              border: { ...data.border, enabled: checked },
            });
          }}
        />
        {data.border.enabled && (
          <div className="grow">
            <div className="ml-auto w-36 relative">
              <Input
                type="text"
                id={'border-width'}
                name={'Border width'}
                value={data.border.borderWidth}
                onChange={handleOnChange}
                className="py-3 px-4 ps-4 pe-8 block w-full  shadow-sm rounded-lg text-sm "
                placeholder={''}
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
            <ThemeColorPicker
              defaultColor={data.border.color.color}
              showAutoButton={true}
              isAutoColor={data.border.color.color === 'Auto'}
              autoColor={finalSettings?.buttons[name].border.color.color}
              onChange={(value: string) => {
                update({
                  border: {
                    ...data.border,
                    color: { ...data.border.color, color: value },
                  },
                });
              }}
              className="rounded-r-none"
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Hover</div>
            <ThemeColorPicker
              defaultColor={data.border.color.hover}
              showAutoButton={true}
              isAutoColor={data.border.color.hover === 'Auto'}
              autoColor={finalSettings?.buttons[name].border.color.hover}
              onChange={(value: string) => {
                update({
                  border: {
                    ...data.border,
                    color: { ...data.border.color, hover: value },
                  },
                });
              }}
              className="rounded-none border-x-0"
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">Click</div>
            <ThemeColorPicker
              defaultColor={data.border.color.active}
              showAutoButton={true}
              isAutoColor={data.border.color.active === 'Auto'}
              autoColor={finalSettings?.buttons[name].border.color.active}
              onChange={(value: string) => {
                update({
                  border: {
                    ...data.border,
                    color: { ...data.border.color, active: value },
                  },
                });
              }}
              className="rounded-l-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};

ThemeSettingsButton.displayName = 'ThemeSettingsButton';
