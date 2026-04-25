import { AttributeDataType } from '@usertour/types';
import { cn } from '@usertour-packages/tailwind';

const TYPE_LABELS: Partial<Record<AttributeDataType, string>> = {
  [AttributeDataType.Number]: 'NUMBER',
  [AttributeDataType.String]: 'STRING',
  [AttributeDataType.Boolean]: 'BOOLEAN',
  [AttributeDataType.List]: 'LIST',
  [AttributeDataType.DateTime]: 'DATETIME',
  [AttributeDataType.RandomAB]: 'RANDOM A/B',
  [AttributeDataType.RandomNumber]: 'RANDOM',
};

interface AttributeTypeChipProps {
  dataType?: AttributeDataType;
  className?: string;
}

export const AttributeTypeChip = ({ dataType, className }: AttributeTypeChipProps) => {
  if (dataType === undefined) return null;
  const label = TYPE_LABELS[dataType];
  if (!label) return null;

  return (
    <span
      className={cn(
        'ml-1.5 inline-block rounded bg-muted px-1 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 align-middle',
        className,
      )}
    >
      {label}
    </span>
  );
};

AttributeTypeChip.displayName = 'AttributeTypeChip';
