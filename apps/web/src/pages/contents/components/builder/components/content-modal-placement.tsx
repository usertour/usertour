import { Button, Label, QuestionTooltip } from '@usertour/ui';
import { ModalPosition } from '@usertour/types';
import { ContentModalPlacementData } from '@usertour/types';
import { cn } from '@usertour/tailwind';
import { useTranslation } from 'react-i18next';
import { InputNumber } from '@/pages/contents/components/builder/components/shared/input';

interface PlacementButtonProps {
  position: ModalPosition;
  currentPosition: ModalPosition;
  text: string;
  onPositionChange: (position: ModalPosition) => void;
}

const PlacementButton = (props: PlacementButtonProps) => {
  const { text, position, onPositionChange, currentPosition } = props;
  return (
    <Button
      className={cn(
        'h-8 w-24 p-0.5 text-xs bg-background-400',
        currentPosition === position ? 'bg-primary' : '',
      )}
      onClick={() => {
        onPositionChange(position);
      }}
    >
      {text}
    </Button>
  );
};

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

  const handleCurrentPositionChange = (position: ModalPosition) => {
    update({ position });
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
      <div className="flex flex-col bg-background-700 p-3.5 rounded-lg space-y-6 mt-2">
        <div className="flex justify-between">
          <PlacementButton
            text={t('contentBuilder.shared.position.leftTop')}
            position={ModalPosition.LeftTop}
            currentPosition={data.position}
            onPositionChange={handleCurrentPositionChange}
          />
          <PlacementButton
            text={t('contentBuilder.shared.position.rightTop')}
            position={ModalPosition.RightTop}
            currentPosition={data.position}
            onPositionChange={handleCurrentPositionChange}
          />
        </div>
        <div className="flex justify-center">
          <PlacementButton
            text={t('contentBuilder.shared.position.center')}
            position={ModalPosition.Center}
            currentPosition={data.position}
            onPositionChange={handleCurrentPositionChange}
          />
        </div>
        <div className="flex justify-between">
          <PlacementButton
            text={t('contentBuilder.shared.position.leftBottom')}
            position={ModalPosition.LeftBottom}
            currentPosition={data.position}
            onPositionChange={handleCurrentPositionChange}
          />
          <PlacementButton
            text={t('contentBuilder.shared.position.rightBottom')}
            position={ModalPosition.RightBottom}
            currentPosition={data.position}
            onPositionChange={handleCurrentPositionChange}
          />
        </div>
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
