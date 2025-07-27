import { CubeIcon, OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { EXTENSION_SELECT } from '@usertour-packages/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { HelpTooltip } from '@usertour-packages/shared-components';
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
          <HelpTooltip>
            If this step has special requirements, you can use a different theme than the rest of
            the flow uses. You can design your themes under Settings - Themes.
          </HelpTooltip>
        </div>

        <Button variant="link" onClick={onEdited} className="p-0 h-full">
          Edit this theme
          <OpenInNewWindowIcon className="ml-1" />
        </Button>
      </div>

      <Select value={themeId} onValueChange={handleThemeChange}>
        <SelectTrigger className="justify-start flex h-8">
          <CubeIcon className="flex-none mr-2" />
          <div className="grow text-left">
            <SelectValue placeholder="Same as flow theme" />
          </div>
        </SelectTrigger>
        <SelectContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
          {themeOptions.map(({ id, name }) => (
            <SelectItem value={id} key={id}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
ContentTheme.displayName = 'ContentTheme';
