import { ThemeSettingInput } from "@/components/molecules/theme/theme-setting-input";
import { Label } from "@usertour-ui/label";
import { Switch } from "@usertour-ui/switch";
import { ChangeEvent } from "react";
import { ThemeSelectColor } from "@/components/molecules/theme/theme-select-color";
import { Input } from "@usertour-ui/input";
import { useThemeSettingsContext } from ".";

export const ThemeSettingsBorder = () => {
  const { settings, setSettings, finalSettings } = useThemeSettingsContext();

  const updateBorder = (data: Partial<typeof settings.border>) => {
    const { border } = settings;
    setSettings((pre) => ({ ...pre, border: { ...border, ...data } }));
  };

  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      updateBorder({ borderWidth: Number(e.target.value) });
    }
  };
  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingInput
          text="Border radius"
          name="border-radius"
          defaultValue={settings.border.borderRadius}
          onChange={(value: string) => {
            updateBorder({ borderRadius: value });
          }}
        />
        <div className="flex flex-row items-center space-x-2 h-9">
          <Label htmlFor="border-switch" className="flex flex-col space-y-1">
            <span className="font-normal">Border</span>
          </Label>
          <Switch
            id="border-switch"
            checked={settings.border.borderWidthEnabled}
            className="data-[state=unchecked]:bg-input"
            onCheckedChange={(checked: boolean) => {
              updateBorder({ borderWidthEnabled: checked });
            }}
          />

          {settings.border.borderWidthEnabled && (
            <div className="grow">
              <div className="ml-auto w-36 relative">
                <Input
                  type="number"
                  id={"border-width"}
                  name={"Border width"}
                  onChange={handleOnChange}
                  value={settings.border.borderWidth}
                  className="py-3 px-4 ps-4 pe-8 block w-full  shadow-sm rounded-lg text-sm "
                  placeholder={""}
                />
                <div className="absolute inset-y-0 end-0 flex items-center pointer-events-none z-20 pe-4">
                  <span className="text-gray-500">px</span>
                </div>
              </div>
            </div>
          )}
        </div>
        {settings.border.borderWidthEnabled && (
          <>
            <ThemeSelectColor
              name="border-color"
              defaultColor={settings.border.borderColor}
              showAutoButton={true}
              isAutoColor={settings.border.borderColor == "Auto"}
              autoColor={finalSettings?.border.borderColor}
              onChange={(value: string) => {
                updateBorder({ borderColor: value });
              }}
              text="Border color"
            />
          </>
        )}
      </div>
    </div>
  );
};

ThemeSettingsBorder.displayName = "ThemeSettingsBorder";
