import { ColorPicker } from '@usertour/ui';
import { useCurrentUserId } from '@usertour/hooks';
import { useTranslation } from 'react-i18next';

type ThemeSelectColorProps = {
  text: string;
  placeholder?: string;
  name: string;
  defaultColor: string;
  onChange?: (color: string) => void;
  autoColor?: string;
  isAutoColor?: boolean;
  showAutoButton?: boolean;
  disabled?: boolean;
};

export const ThemeSelectColor = (props: ThemeSelectColorProps) => {
  const { text, name, defaultColor, onChange, autoColor, isAutoColor, showAutoButton, disabled } =
    props;
  const userId = useCurrentUserId();
  const { t } = useTranslation();

  return (
    <div className="flex flex-row">
      <div className="text-sm grow">
        <label htmlFor={name} className="block text-sm leading-9">
          {text}
        </label>
      </div>
      <div className="flex-none w-36 relative">
        <ColorPicker
          defaultColor={defaultColor}
          onChange={onChange}
          autoColor={autoColor}
          isAutoColor={isAutoColor}
          showAutoButton={showAutoButton}
          disabled={disabled}
          userId={userId}
          autoLabel={t('common.colorPicker.auto')}
          labels={{
            useThisColor: t('common.colorPicker.useThisColor'),
            removeColor: t('common.colorPicker.removeColor'),
            tailwindColors: t('common.colorPicker.tailwindColors'),
            recentlyUsed: t('common.colorPicker.recentlyUsed'),
            done: t('common.colorPicker.done'),
            colorPicker: t('common.colorPicker.colorPicker'),
            colorPalette: t('common.colorPicker.colorPalette'),
          }}
        />
      </div>
    </div>
  );
};

ThemeSelectColor.displayName = 'ThemeSelectColor';
