import { AttributeDataType } from '@usertour/types';
import { cn } from '@usertour/tailwind';
import { useTranslation } from 'react-i18next';

const TYPE_I18N_KEYS: Partial<Record<AttributeDataType, string>> = {
  [AttributeDataType.Number]: 'attributes.typeChip.number',
  [AttributeDataType.String]: 'attributes.typeChip.string',
  [AttributeDataType.Boolean]: 'attributes.typeChip.boolean',
  [AttributeDataType.List]: 'attributes.typeChip.list',
  [AttributeDataType.DateTime]: 'attributes.typeChip.dateTime',
  [AttributeDataType.RandomAB]: 'attributes.typeChip.randomAB',
  [AttributeDataType.RandomNumber]: 'attributes.typeChip.randomNumber',
};

interface AttributeTypeChipProps {
  dataType?: AttributeDataType;
  className?: string;
}

export const AttributeTypeChip = ({ dataType, className }: AttributeTypeChipProps) => {
  const { t } = useTranslation();
  if (dataType === undefined) return null;
  const i18nKey = TYPE_I18N_KEYS[dataType];
  if (!i18nKey) return null;

  return (
    <span
      className={cn(
        'ml-1.5 inline-block rounded bg-muted px-1 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 align-middle',
        className,
      )}
    >
      {t(i18nKey)}
    </span>
  );
};

AttributeTypeChip.displayName = 'AttributeTypeChip';
