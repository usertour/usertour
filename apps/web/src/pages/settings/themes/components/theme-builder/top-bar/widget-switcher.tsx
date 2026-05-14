import {
  BannerIcon,
  ChecklistIcon,
  FlowIcon,
  LauncherIcon,
  ResourceCenterIcon,
} from '@usertour/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@usertour/select';
import { ThemeDetailPreviewType } from '@usertour/types';
import type { ComponentType } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  value: ThemeDetailPreviewType;
  onChange: (value: ThemeDetailPreviewType) => void;
}

interface WidgetOption {
  value: ThemeDetailPreviewType;
  label: string;
  // The icon is the entity's content-type icon, not a "shape" of the widget.
  // Tooltip / Modal / Bubble / NPS all share FlowIcon because they're forms a
  // flow step can take; Launcher icon / beacon / button all share LauncherIcon
  // because they're forms a launcher takes; etc. This keeps the widget switcher
  // visually grouped by content type and matches the sidebar nav so users
  // bridge "Flows in sidebar" → "Tooltip/Modal/Bubble/NPS in here" without a
  // second mental hop.
  //
  // Typed by the only prop we actually pass (`className`) so it accepts both
  // icon families: @usertour/icons (IconProps) and remixicon
  // (RemixiconProps). SVGProps<SVGSVGElement> would be too loose — both
  // families forbid `children`, which SVGProps allows.
  Icon: ComponentType<{ className?: string }>;
}

export function WidgetSwitcher({ value, onChange }: Props) {
  const { t } = useTranslation();

  const options = useMemo<WidgetOption[]>(
    () => [
      {
        value: ThemeDetailPreviewType.TOOLTIP,
        label: t('themeBuilder.previewTypes.tooltip'),
        Icon: FlowIcon,
      },
      {
        value: ThemeDetailPreviewType.MODAL,
        label: t('themeBuilder.previewTypes.modal'),
        Icon: FlowIcon,
      },
      {
        value: ThemeDetailPreviewType.BUBBLE,
        label: t('themeBuilder.previewTypes.speechBubble'),
        Icon: FlowIcon,
      },
      {
        value: ThemeDetailPreviewType.BANNER,
        label: t('themeBuilder.previewTypes.banner'),
        Icon: BannerIcon,
      },
      {
        value: ThemeDetailPreviewType.LAUNCHER_ICON,
        label: t('themeBuilder.previewTypes.launcherIcon'),
        Icon: LauncherIcon,
      },
      {
        value: ThemeDetailPreviewType.LAUNCHER_BEACON,
        label: t('themeBuilder.previewTypes.launcherBeacon'),
        Icon: LauncherIcon,
      },
      {
        value: ThemeDetailPreviewType.LAUNCHER_BUTTON,
        label: t('themeBuilder.previewTypes.launcherButton'),
        Icon: LauncherIcon,
      },
      {
        value: ThemeDetailPreviewType.CHECKLIST,
        label: t('themeBuilder.previewTypes.checklist'),
        Icon: ChecklistIcon,
      },
      {
        value: ThemeDetailPreviewType.CHECKLIST_LAUNCHER,
        label: t('themeBuilder.previewTypes.checklistLauncher'),
        Icon: ChecklistIcon,
      },
      {
        value: ThemeDetailPreviewType.NPS,
        label: t('themeBuilder.previewTypes.nps'),
        Icon: FlowIcon,
      },
      {
        value: ThemeDetailPreviewType.RESOURCE_CENTER,
        label: t('themeBuilder.previewTypes.resourceCenter'),
        Icon: ResourceCenterIcon,
      },
      {
        value: ThemeDetailPreviewType.RESOURCE_CENTER_LAUNCHER,
        label: t('themeBuilder.previewTypes.resourceCenterLauncher'),
        Icon: ResourceCenterIcon,
      },
    ],
    [t],
  );

  const selected = options.find((opt) => opt.value === value);

  return (
    <Select value={value} onValueChange={(next) => onChange(next as ThemeDetailPreviewType)}>
      <SelectTrigger
        variant="compact-muted"
        className="h-7 w-52 truncate whitespace-nowrap bg-transparent text-sm shadow-none hover:bg-muted/40 md:text-sm"
      >
        {selected ? (
          <span className="inline-flex min-w-0 items-center gap-2">
            <selected.Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{selected.label}</span>
          </span>
        ) : (
          <SelectValue placeholder={t('themeBuilder.placeholders.selectWidget')} />
        )}
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-sm">
            <span className="inline-flex items-center gap-2">
              <opt.Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{opt.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
