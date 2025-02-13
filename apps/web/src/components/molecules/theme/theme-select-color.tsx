import { ThemeColorPicker } from './theme-color-picker';

type ThemeSelectColorProps = {
  text: string;
  placeholder?: string;
  name: string;
  defaultColor: string;
  onChange?: (color: string) => void;
  autoColor?: string;
  isAutoColor?: boolean;
  showAutoButton?: boolean;
};

export const ThemeSelectColor = (props: ThemeSelectColorProps) => {
  const { text, name, defaultColor, onChange, autoColor, isAutoColor, showAutoButton } = props;

  return (
    <div className="flex flex-row">
      <div className="text-sm grow">
        <label htmlFor={name} className="block text-sm leading-9">
          {text}
        </label>
      </div>
      <div className="flex-none w-36 relative">
        <ThemeColorPicker
          defaultColor={defaultColor}
          onChange={onChange}
          autoColor={autoColor}
          isAutoColor={isAutoColor}
          showAutoButton={showAutoButton}
        />
      </div>
    </div>
  );
};

ThemeSelectColor.displayName = 'ThemeSelectColor';
