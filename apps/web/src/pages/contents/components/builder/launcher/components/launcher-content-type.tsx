import { LauncherIcon, RiEyeOffLine, RiInformationLine, RiSquareLine } from '@usertour/icons';
import {
  CompactSelectContent,
  CompactSelectItem,
  CompactSelectRoot,
  CompactSelectTrigger,
  CompactSelectValue,
} from '@usertour/ui';
import { LauncherDataType } from '@usertour/types';
import { useTranslation } from 'react-i18next';

interface LauncherTypeProps {
  type: LauncherDataType;
  zIndex: number;
  onChange: (value: LauncherDataType) => void;
}

const getIcon = (dataType: LauncherDataType) => {
  switch (dataType) {
    case LauncherDataType.BEACON:
      return <LauncherIcon width={16} height={16} className="opacity-70" />;
    case LauncherDataType.ICON:
      return <RiInformationLine size={16} className="text-current opacity-70" />;
    case LauncherDataType.BUTTON:
      return <RiSquareLine size={16} className="text-current opacity-70" />;
    case LauncherDataType.HIDDEN:
      return <RiEyeOffLine size={16} className="text-current opacity-70" />;
  }
};

export const LauncherContentType = ({ zIndex, type, onChange }: LauncherTypeProps) => {
  const { t } = useTranslation();

  const getLabel = (dataType: LauncherDataType) => t(`contentBuilder.launcher.type.${dataType}`);
  const getDescription = (dataType: LauncherDataType) =>
    t(`contentBuilder.launcher.type.${dataType}Description`);

  return (
    <CompactSelectRoot
      value={type}
      onValueChange={(value) => onChange(value as LauncherDataType)}
      modal={false}
    >
      <CompactSelectTrigger className="bg-slate-50 shadow-none">
        <span className="flex shrink-0 items-center">{getIcon(type)}</span>
        <CompactSelectValue className="min-w-0 flex-1 truncate text-left">
          {(value) => getLabel(value as LauncherDataType)}
        </CompactSelectValue>
      </CompactSelectTrigger>
      <CompactSelectContent style={{ zIndex }}>
        {Object.values(LauncherDataType).map((value) => (
          <CompactSelectItem
            key={value}
            value={value}
            label={getLabel(value)}
            className="items-start gap-2.5 py-2"
          >
            <span className="mt-0.5 flex shrink-0 items-center">{getIcon(value)}</span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium leading-none">{getLabel(value)}</span>
              <p className="text-xs leading-snug text-muted-foreground">{getDescription(value)}</p>
            </div>
          </CompactSelectItem>
        ))}
      </CompactSelectContent>
    </CompactSelectRoot>
  );
};
LauncherContentType.displayName = 'LauncherContentType';
