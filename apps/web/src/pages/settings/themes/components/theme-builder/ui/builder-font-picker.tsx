import { VirtualizedComboboxSelect, type ComboboxSelectOption } from '@usertour/ui';
import { fontItems } from '@/utils/webfonts';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface BuilderFontPickerProps {
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  id?: string;
}

// Names are also the stored values in settings, so they stay as English
// constants. The visible label is translated separately at render time.
const SYSTEM_ITEMS: { name: string; labelKey: string }[] = [
  { name: 'System font', labelKey: 'themeBuilder.fontPicker.systemFont' },
  { name: 'Custom font', labelKey: 'themeBuilder.fontPicker.customFont' },
];

// Searchable single-select on the shared ComboboxSelect (Base UI combobox kit).
// The web-font catalog is ~1.6k entries, so it runs in the windowed mode — a
// flat list with the two system options on top, set off from the fonts by a
// divider via their `group` tag.
export const BuilderFontPicker = (props: BuilderFontPickerProps) => {
  const { value, onChange, disabled, id } = props;
  const { t } = useTranslation();

  const options = useMemo<ComboboxSelectOption[]>(
    () => [
      ...SYSTEM_ITEMS.map((item) => ({
        value: item.name,
        label: t(item.labelKey),
        group: 'system',
      })),
      ...fontItems.map((item) => ({ value: item.name, label: item.name, group: 'fonts' })),
    ],
    [t],
  );

  return (
    <VirtualizedComboboxSelect
      id={id}
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder={t('themeBuilder.fontPicker.placeholder')}
      searchPlaceholder={t('themeBuilder.fontPicker.searchPlaceholder')}
      emptyText={t('themeBuilder.fontPicker.noItemsFound')}
      size="compact"
      disabled={disabled}
    />
  );
};
