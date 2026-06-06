import { Button, CompactSelect, QuestionTooltip } from '@usertour/ui';
import { BUILDER_Z } from '@usertour/constants';
import { RiExternalLinkLine, RiPaletteLine } from '@usertour/icons';
import { Theme } from '@usertour/types';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ContentThemeProps {
  themeList: Theme[] | null;
  themeId?: string;
  onChange: (themeId: string | undefined) => void;
  onEdited: () => void;
}

export const ContentTheme = (props: ContentThemeProps) => {
  const { themeId: initialValue, themeList, onChange, onEdited } = props;
  const { t } = useTranslation();

  const themeOptions = useMemo(() => {
    const defaultOption = [{ id: 'same', name: t('contentBuilder.shared.theme.sameAsFlow') }];
    return themeList ? [...defaultOption, ...themeList] : defaultOption;
  }, [themeList, t]);

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
          <h1 className="text-sm">{t('contentBuilder.shared.theme.label')}</h1>
          <QuestionTooltip>{t('contentBuilder.shared.theme.stepTooltip')}</QuestionTooltip>
        </div>

        <Button variant="link" onClick={onEdited} className="p-0 h-full">
          {t('contentBuilder.shared.theme.edit')}
          <RiExternalLinkLine className="ml-1 h-4 w-4 opacity-70" />
        </Button>
      </div>

      <CompactSelect
        icon={<RiPaletteLine className="opacity-70" />}
        options={themeOptions.map(({ id, name }) => ({ value: id, label: name }))}
        value={themeId}
        onChange={handleThemeChange}
        placeholder={t('contentBuilder.shared.theme.sameAsFlow')}
        className="w-full bg-slate-50 shadow-none hover:bg-slate-100"
        contentStyle={{ zIndex: BUILDER_Z.popover }}
      />
    </div>
  );
};
ContentTheme.displayName = 'ContentTheme';
