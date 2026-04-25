'use client';

import { Badge } from '@usertour-packages/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@usertour-packages/tooltip';
import { cn } from '@usertour-packages/tailwind';
import { AttributeDataType } from '@usertour/types';
import { format, formatDistanceToNow } from 'date-fns';

const Empty = () => <span className="text-muted-foreground/60">—</span>;

const hoverTooltip = (trigger: React.ReactNode, content: React.ReactNode) => (
  <Tooltip delayDuration={400}>
    <TooltipTrigger asChild>{trigger}</TooltipTrigger>
    <TooltipContent usePortal side="top" className="max-w-sm break-words whitespace-pre-wrap">
      {content}
    </TooltipContent>
  </Tooltip>
);

const StringCell = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') return <Empty />;
  const text = String(value);
  return hoverTooltip(<span className="block truncate">{text}</span>, text);
};

const NumberCell = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') return <Empty />;
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return <StringCell value={value} />;
  return <span className="tabular-nums">{n.toLocaleString()}</span>;
};

const BooleanCell = ({ value }: { value: unknown }) => {
  let bool: boolean | null = null;
  if (typeof value === 'boolean') {
    bool = value;
  } else if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1') bool = true;
    else if (lower === 'false' || lower === '0') bool = false;
  } else if (typeof value === 'number') {
    bool = value !== 0;
  }
  if (bool === null) return <Empty />;
  return (
    <Badge variant={bool ? 'success' : 'secondary'} className="font-normal px-2 py-0">
      {bool ? 'True' : 'False'}
    </Badge>
  );
};

const DateTimeCell = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') return <Empty />;
  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return <StringCell value={value} />;
  return hoverTooltip(
    <span className="whitespace-nowrap">{formatDistanceToNow(date)} ago</span>,
    format(date, 'PPpp'),
  );
};

const parseListValue = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value !== '') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // fall through
    }
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const ListCell = ({ value }: { value: unknown }) => {
  const items = parseListValue(value);
  if (items.length === 0) return <Empty />;
  const visible = items.slice(0, 2);
  const more = items.length - visible.length;
  const trigger = (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((v, i) => (
        <Badge key={i} variant="secondary" className="font-normal px-1.5 py-0 max-w-[160px]">
          <span className="truncate">{v}</span>
        </Badge>
      ))}
      {more > 0 && <span className="text-xs text-muted-foreground">+{more}</span>}
    </div>
  );
  return hoverTooltip(trigger, items.join(', '));
};

export const renderAttributeCell = (value: unknown, dataType: number): React.ReactNode => {
  switch (dataType) {
    case AttributeDataType.String:
      return <StringCell value={value} />;
    case AttributeDataType.Number:
      return <NumberCell value={value} />;
    case AttributeDataType.Boolean:
      return <BooleanCell value={value} />;
    case AttributeDataType.DateTime:
      return <DateTimeCell value={value} />;
    case AttributeDataType.List:
      return <ListCell value={value} />;
    default:
      return <StringCell value={value} />;
  }
};

type CellStyle = {
  container: string;
  align: 'left' | 'right';
};

export const getCellStyleForType = (dataType: number): CellStyle => {
  switch (dataType) {
    case AttributeDataType.Number:
      return { container: 'min-w-[100px] max-w-[140px]', align: 'right' };
    case AttributeDataType.Boolean:
      return { container: 'min-w-[80px]', align: 'left' };
    case AttributeDataType.DateTime:
      return { container: 'min-w-[130px] max-w-[180px]', align: 'left' };
    case AttributeDataType.String:
      return { container: 'min-w-[160px] max-w-[280px]', align: 'left' };
    case AttributeDataType.List:
      return { container: 'min-w-[180px] max-w-[320px]', align: 'left' };
    default:
      return { container: 'min-w-[140px] max-w-[280px]', align: 'left' };
  }
};

export const cellAlignClass = (align: 'left' | 'right') => (align === 'right' ? 'text-right' : '');

export const cellContainerClass = (dataType: number) => {
  const style = getCellStyleForType(dataType);
  // truncate keeps TH/TD within max-w in auto-layout tables; cell renderers
  // (list badges, date) set their own inner layout and are unaffected.
  return cn(style.container, 'truncate', cellAlignClass(style.align));
};
