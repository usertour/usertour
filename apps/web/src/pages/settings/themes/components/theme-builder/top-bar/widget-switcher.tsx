import { ThemeDetailPreviewType } from '@usertour/types';
import { BuilderSelect, type BuilderSelectOption } from '../ui';

const PREVIEW_OPTIONS: BuilderSelectOption[] = [
  { value: ThemeDetailPreviewType.TOOLTIP, label: 'Tooltip' },
  { value: ThemeDetailPreviewType.MODAL, label: 'Modal' },
  { value: ThemeDetailPreviewType.BUBBLE, label: 'Speech bubble' },
  { value: ThemeDetailPreviewType.BANNER, label: 'Banner' },
  { value: ThemeDetailPreviewType.LAUNCHER_ICON, label: 'Launcher icon' },
  { value: ThemeDetailPreviewType.LAUNCHER_BEACON, label: 'Launcher beacon' },
  { value: ThemeDetailPreviewType.LAUNCHER_BUTTON, label: 'Launcher button' },
  { value: ThemeDetailPreviewType.CHECKLIST, label: 'Checklist' },
  { value: ThemeDetailPreviewType.CHECKLIST_LAUNCHER, label: 'Checklist launcher' },
  { value: ThemeDetailPreviewType.NPS, label: 'NPS' },
  { value: ThemeDetailPreviewType.RESOURCE_CENTER, label: 'Resource center' },
  { value: ThemeDetailPreviewType.RESOURCE_CENTER_LAUNCHER, label: 'Resource center launcher' },
];

interface Props {
  value: ThemeDetailPreviewType;
  onChange: (value: ThemeDetailPreviewType) => void;
}

export function WidgetSwitcher({ value, onChange }: Props) {
  return (
    <BuilderSelect
      value={value}
      onChange={(next) => onChange(next as ThemeDetailPreviewType)}
      options={PREVIEW_OPTIONS}
      className="h-7 w-40 bg-transparent text-sm shadow-none hover:bg-gray-100 md:text-sm"
    />
  );
}
