import { ColorPicker } from '@usertour-packages/shared-components';

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
        />
      </div>
    </div>
  );
};

ThemeSelectColor.displayName = 'ThemeSelectColor';
