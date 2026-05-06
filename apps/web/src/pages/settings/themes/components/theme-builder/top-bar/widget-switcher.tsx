import { ThemeDetailPreviewType } from '@usertour/types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CompactSelect, type CompactSelectOption } from '@usertour-packages/ui';

interface Props {
  value: ThemeDetailPreviewType;
  onChange: (value: ThemeDetailPreviewType) => void;
}

export function WidgetSwitcher({ value, onChange }: Props) {
  const { t } = useTranslation();
  const options = useMemo<CompactSelectOption[]>(
    () => [
      { value: ThemeDetailPreviewType.TOOLTIP, label: t('themeBuilder.previewTypes.tooltip') },
      { value: ThemeDetailPreviewType.MODAL, label: t('themeBuilder.previewTypes.modal') },
      { value: ThemeDetailPreviewType.BUBBLE, label: t('themeBuilder.previewTypes.speechBubble') },
      { value: ThemeDetailPreviewType.BANNER, label: t('themeBuilder.previewTypes.banner') },
      {
        value: ThemeDetailPreviewType.LAUNCHER_ICON,
        label: t('themeBuilder.previewTypes.launcherIcon'),
      },
      {
        value: ThemeDetailPreviewType.LAUNCHER_BEACON,
        label: t('themeBuilder.previewTypes.launcherBeacon'),
      },
      {
        value: ThemeDetailPreviewType.LAUNCHER_BUTTON,
        label: t('themeBuilder.previewTypes.launcherButton'),
      },
      { value: ThemeDetailPreviewType.CHECKLIST, label: t('themeBuilder.previewTypes.checklist') },
      {
        value: ThemeDetailPreviewType.CHECKLIST_LAUNCHER,
        label: t('themeBuilder.previewTypes.checklistLauncher'),
      },
      { value: ThemeDetailPreviewType.NPS, label: t('themeBuilder.previewTypes.nps') },
      {
        value: ThemeDetailPreviewType.RESOURCE_CENTER,
        label: t('themeBuilder.previewTypes.resourceCenter'),
      },
      {
        value: ThemeDetailPreviewType.RESOURCE_CENTER_LAUNCHER,
        label: t('themeBuilder.previewTypes.resourceCenterLauncher'),
      },
    ],
    [t],
  );

  return (
    <CompactSelect
      value={value}
      onChange={(next) => onChange(next as ThemeDetailPreviewType)}
      options={options}
      className="h-7 w-52 truncate whitespace-nowrap bg-transparent text-sm shadow-none hover:bg-muted/40 md:text-sm"
    />
  );
}
