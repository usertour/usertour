import { Button, CompactSelect, QuestionTooltip } from '@usertour/ui';
import { BUILDER_Z } from '@usertour/constants';
import { RiExternalLinkLine, RiPaletteLine } from '@usertour/icons';
import { Theme } from '@usertour/types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface ContentThemeProps {
  themeList: Theme[] | null;
  themeId?: string | null;
  onChange: (themeId: string | null) => void;
  // Theme builder URL for the selected theme; opened in a new tab via a real
  // link (keeps the content builder context). Undefined → no theme to edit.
  editUrl?: string;
}

export const ContentTheme = (props: ContentThemeProps) => {
  const { themeId, themeList, onChange, editUrl } = props;
  const { t } = useTranslation();

  const themeOptions = useMemo(() => {
    const defaultOption = [{ id: 'same', name: t('contentBuilder.shared.theme.sameAsFlow') }];
    return themeList ? [...defaultOption, ...themeList] : defaultOption;
  }, [themeList, t]);

  // Fully controlled — the select value mirrors the `themeId` prop (the
  // current step's themeId) every render. No local shadow state: switching
  // steps reflects the new step's theme instead of keeping the previous one's
  // (the bug a useState(initialValue) seeded once at mount caused). 'same' is
  // the sentinel for "inherit the flow theme", stored as null — NOT undefined,
  // which JSON-serializes away so a "clear the theme" save would silently keep
  // the previous theme on the server.
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          <h1 className="text-sm">{t('contentBuilder.shared.theme.label')}</h1>
          <QuestionTooltip>{t('contentBuilder.shared.theme.stepTooltip')}</QuestionTooltip>
        </div>

        <Button variant="link" asChild className="p-0 h-full">
          <a href={editUrl} target="_blank" rel="noopener noreferrer">
            {t('contentBuilder.shared.theme.edit')}
            <RiExternalLinkLine className="ml-1 h-4 w-4 opacity-70" />
          </a>
        </Button>
      </div>

      <CompactSelect
        icon={<RiPaletteLine className="opacity-70" />}
        options={themeOptions.map(({ id, name }) => ({ value: id, label: name }))}
        value={themeId ?? 'same'}
        onChange={(value) => onChange(value === 'same' ? null : value)}
        placeholder={t('contentBuilder.shared.theme.sameAsFlow')}
        className="w-full bg-surface dark:bg-surface-raised/50 shadow-none hover:bg-muted"
        contentStyle={{ zIndex: BUILDER_Z.popover }}
      />
    </div>
  );
};
ContentTheme.displayName = 'ContentTheme';
