import { Button, CompactSelect, QuestionTooltip } from '@usertour/ui';
import { RiExternalLinkLine, RiPaletteLine } from '@usertour/icons';
import { EXTENSION_SELECT } from '@usertour/constants';
import { Theme } from '@usertour/types';
import { useCallback, useMemo, useState } from 'react';

interface ContentThemeProps {
  themeList: Theme[] | null;
  themeId?: string;
  onChange: (themeId: string | undefined) => void;
  onEdited: () => void;
  zIndex: number;
}

export const ContentTheme = (props: ContentThemeProps) => {
  const { themeId: initialValue, themeList, onChange, onEdited, zIndex } = props;

  const themeOptions = useMemo(() => {
    const defaultOption = [{ id: 'same', name: 'Same as flow theme' }];
    return themeList ? [...defaultOption, ...themeList] : defaultOption;
  }, [themeList]);

  const [themeId, setThemeId] = useState(initialValue ?? 'same');

  const handleThemeChange = useCallback(
    (value: string) => {
      setThemeId(value);
      onChange(value === 'same' ? undefined : value);
    },
    [onChange],
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          <h1 className="text-sm">Theme</h1>
          <QuestionTooltip>
            If this step has special requirements, you can use a different theme than the rest of
            the flow uses. You can design your themes under Settings - Themes.
          </QuestionTooltip>
        </div>

        <Button variant="link" onClick={onEdited} className="p-0 h-full">
          Edit this theme
          <RiExternalLinkLine className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <CompactSelect
        icon={<RiPaletteLine />}
        options={themeOptions.map(({ id, name }) => ({ value: id, label: name }))}
        value={themeId}
        onChange={handleThemeChange}
        placeholder="Same as flow theme"
        className="w-full"
        contentStyle={{ zIndex: zIndex + EXTENSION_SELECT }}
      />
    </div>
  );
};
ContentTheme.displayName = 'ContentTheme';
