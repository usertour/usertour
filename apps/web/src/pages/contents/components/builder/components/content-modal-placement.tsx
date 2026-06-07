import { Label, QuestionTooltip } from '@usertour/ui';
import { ContentModalPlacementData, ModalPosition } from '@usertour/types';
import { cn } from '@usertour/tailwind';
import { useTranslation } from 'react-i18next';
import { InputNumber } from '@/pages/contents/components/builder/components/shared/input';

// 3×3 spatial picker — the cell's location in the grid is the modal's position
// on screen (top row / middle row / bottom row).
const POSITION_GRID: ModalPosition[] = [
  ModalPosition.LeftTop,
  ModalPosition.CenterTop,
  ModalPosition.RightTop,
  ModalPosition.LeftCenter,
  ModalPosition.Center,
  ModalPosition.RightCenter,
  ModalPosition.LeftBottom,
  ModalPosition.CenterBottom,
  ModalPosition.RightBottom,
];

// Per-cell marker alignment, derived from the cell's row / column in the grid —
// the marker sits where the modal would appear on screen, so each cell reads as
// a mini screen preview.
const CELL_ROW_ALIGN = ['items-start', 'items-center', 'items-end'];
const CELL_COL_ALIGN = ['justify-start', 'justify-center', 'justify-end'];

export interface ContentModalPlacementProps {
  data: ContentModalPlacementData;
  onChange: (value: ContentModalPlacementData) => void;
  name?: string;
}

// Controlled: renders straight from `data` and writes every edit back through
// `onChange` — the parent step data is the single source of truth (no local
// copy, so external changes flow through immediately).
export const ContentModalPlacement = (props: ContentModalPlacementProps) => {
  const { data, onChange, name = 'modal' } = props;
  const { t } = useTranslation();

  const update = (patch: Partial<ContentModalPlacementData>) => {
    onChange({ ...data, ...patch });
  };

  const handleOffsetXChange = (value: number | undefined) => {
    update({ positionOffsetX: value ?? 0 });
  };
  const handleOffsetYChange = (value: number | undefined) => {
    update({ positionOffsetY: value ?? 0 });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-start space-x-1">
        <h1 className="text-sm">{t('contentBuilder.shared.placement')}</h1>
        <QuestionTooltip>{t('contentBuilder.shared.placementTooltip', { name })}</QuestionTooltip>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {POSITION_GRID.map((position, index) => {
          const label = t(`contentBuilder.shared.position.${position}`);
          const active = data.position === position;
          const align = `${CELL_ROW_ALIGN[Math.floor(index / 3)]} ${CELL_COL_ALIGN[index % 3]}`;
          return (
            <button
              key={position}
              type="button"
              aria-label={label}
              aria-pressed={active}
              title={label}
              onClick={() => update({ position })}
              className={cn(
                'flex h-8 w-full rounded-md border p-1 transition-colors',
                align,
                active
                  ? 'border-primary bg-accent/50'
                  : 'border-border bg-surface hover:border-border hover:bg-muted',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-3 rounded-[2px]',
                  active ? 'bg-primary' : 'bg-muted-foreground/40',
                )}
              />
            </button>
          );
        })}
      </div>
      {data.position !== ModalPosition.Center && (
        <>
          <div className="flex flex-col space-y-2">
            <div className="flex space-x-1 justify-start items-center">
              <Label htmlFor="modal-offset-x">{t('contentBuilder.shared.horizontalOffset')}</Label>
              <QuestionTooltip>
                {t('contentBuilder.shared.horizontalOffsetTooltip', { name })}
              </QuestionTooltip>
            </div>
            <InputNumber
              defaultNumber={data.positionOffsetX || 0}
              onValueChange={handleOffsetXChange}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <div className="flex space-x-1 justify-start items-center">
              <Label htmlFor="modal-offset-y">{t('contentBuilder.shared.verticalOffset')}</Label>
              <QuestionTooltip>
                {t('contentBuilder.shared.verticalOffsetTooltip', { name })}
              </QuestionTooltip>
            </div>
            <InputNumber
              defaultNumber={data.positionOffsetY || 0}
              onValueChange={handleOffsetYChange}
            />
          </div>
        </>
      )}
    </div>
  );
};

ContentModalPlacement.displayName = 'ContentModalPlacement';
