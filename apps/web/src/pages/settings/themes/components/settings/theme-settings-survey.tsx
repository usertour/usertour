import { ThemeSelectColor } from '@/components/molecules/theme/theme-select-color';
import { useThemeSettingsContext } from '.';

export const ThemeSettingsSurvey = () => {
  const { settings, setSettings, finalSettings } = useThemeSettingsContext();

  // Update survey settings helper function
  const update = (data: Partial<typeof settings.survey>) => {
    const { survey } = settings;
    setSettings((pre) => ({
      ...pre,
      survey: { ...survey, ...data },
    }));
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSelectColor
          text="Survey color"
          name="survey-color"
          defaultColor={settings.survey.color}
          showAutoButton={true}
          isAutoColor={settings.survey.color === 'Auto'}
          autoColor={finalSettings?.survey.color}
          onChange={(value: string) => {
            update({ color: value });
          }}
        />
      </div>
    </div>
  );
};

ThemeSettingsSurvey.displayName = 'ThemeSettingsSurvey';
