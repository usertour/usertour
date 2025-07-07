import { ThemeSelectColor } from '@/components/molecules/theme/theme-select-color';
import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import { ProgressBarType, ProgressBarPosition } from '@usertour-ui/types';
import { Label } from '@usertour-ui/label';
import { Switch } from '@usertour-ui/switch';
import { useThemeSettingsContext } from '.';

export const ThemeSettingsProgress = () => {
  const { settings, setSettings, finalSettings } = useThemeSettingsContext();
  const update = (data: Partial<typeof settings.progress>) => {
    const { progress } = settings;
    setSettings((pre) => ({
      ...pre,
      progress: { ...progress, ...data },
    }));
  };

  const progressTypeItems = [
    { name: 'Full width progress bar', value: ProgressBarType.FULL_WIDTH },
    { name: 'Narrow progress bar', value: ProgressBarType.NARROW },
    { name: 'Chain rounded', value: ProgressBarType.CHAIN_ROUNDED },
    { name: 'Chain squared', value: ProgressBarType.CHAIN_SQUARED },
    { name: 'Dots', value: ProgressBarType.DOTS },
    { name: 'Numbered (1 of 3)', value: ProgressBarType.NUMBERED },
  ];

  const positionItems = [
    { name: 'Top', value: ProgressBarPosition.TOP },
    { name: 'Bottom', value: ProgressBarPosition.BOTTOM },
  ];

  const showPositionSelector = settings.progress.type !== ProgressBarType.FULL_WIDTH;

  // Get the appropriate label and name for the height/size input based on progress type
  const getHeightInputProps = () => {
    switch (settings.progress.type) {
      case ProgressBarType.FULL_WIDTH:
      case ProgressBarType.NARROW:
        return { text: 'Progress bar height', name: 'progress-bar-height' };
      case ProgressBarType.CHAIN_ROUNDED:
      case ProgressBarType.CHAIN_SQUARED:
        return { text: 'Chain height', name: 'progress-bar-height' };
      case ProgressBarType.DOTS:
        return { text: 'Dot size', name: 'progress-bar-height' };
      case ProgressBarType.NUMBERED:
        return { text: 'Font size', name: 'progress-bar-height' };
      default:
        return { text: 'Progress bar height', name: 'progress-bar-height' };
    }
  };

  // Get default height value for each progress type
  const getDefaultHeight = (type: ProgressBarType) => {
    switch (type) {
      case ProgressBarType.FULL_WIDTH:
        return 2;
      case ProgressBarType.NARROW:
        return 5;
      case ProgressBarType.CHAIN_ROUNDED:
        return 6;
      case ProgressBarType.CHAIN_SQUARED:
        return 4;
      case ProgressBarType.DOTS:
        return 10;
      case ProgressBarType.NUMBERED:
        return 12;
      default:
        return 2;
    }
  };

  const heightInputProps = getHeightInputProps();

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <div className="flex flex-row items-center space-x-2 h-8">
          <Label htmlFor="progress-switch" className="flex flex-col space-y-1">
            <span className="font-normal">Show progress bar</span>
          </Label>
          <Switch
            id="progress-switch"
            checked={settings.progress.enabled}
            className="data-[state=unchecked]:bg-input"
            onCheckedChange={(checked: boolean) => {
              update({ enabled: checked });
            }}
          />
        </div>

        {settings.progress.enabled && (
          <>
            <ThemeSettingSelect
              text="Progress bar type"
              name="progress-bar-type"
              defaultValue={settings.progress.type}
              items={progressTypeItems}
              vertical={true}
              onValueChange={(value: string) => {
                const progressType = value as ProgressBarType;
                const defaultHeight = getDefaultHeight(progressType);
                update({ type: progressType, height: defaultHeight });
              }}
            />

            {showPositionSelector && (
              <ThemeSettingSelect
                text="Progress bar position"
                name="progress-bar-position"
                defaultValue={settings.progress.position}
                items={positionItems}
                onValueChange={(value: string) => {
                  update({ position: value as ProgressBarPosition });
                }}
              />
            )}

            <ThemeSelectColor
              text="Progress bar color"
              name="progress-bar-color"
              defaultColor={settings.progress.color}
              showAutoButton={true}
              isAutoColor={settings.progress.color === 'Auto'}
              autoColor={finalSettings?.brandColor.background}
              onChange={(value: string) => {
                update({ color: value });
              }}
            />
            <ThemeSettingInput
              text={heightInputProps.text}
              name={heightInputProps.name}
              defaultValue={String(settings.progress.height)}
              onChange={(value: string) => {
                update({ height: Number(value) });
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

ThemeSettingsProgress.displayName = 'ThemeSettingsProgress';
