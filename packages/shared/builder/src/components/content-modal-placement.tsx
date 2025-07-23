import { Button } from '@usertour-packages/button';
import { Label } from '@usertour-packages/label';
import { HelpTooltip } from '@usertour-packages/shared-components';
import { ModalPosition } from '@usertour/types';
import { ContentModalPlacementData } from '@usertour/types';
import { cn } from '@usertour-packages/utils';
import { useState } from 'react';
import { InputNumber } from './shared/input';

const PlacementButton = (props: {
  position: ModalPosition;
  currentPosition: ModalPosition;
  text: string;
  onPositionChange: (position: ModalPosition) => void;
}) => {
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

export const ContentModalPlacement = (props: ContentModalPlacementProps) => {
  const { data: initialValue, onChange, name = 'modal' } = props;
  const [data, setData] = useState<ContentModalPlacementData>(initialValue);

  const update = (fn: (pre: ContentModalPlacementData) => ContentModalPlacementData) => {
    setData((pre) => {
      const v = fn(pre);
      onChange(v);
      return v;
    });
  };

  const handleCurrentPositionChange = (position: ModalPosition) => {
    update((pre) => ({ ...pre, position }));
  };
  const handleOffsetXChange = (value: number) => {
    update((pre) => ({ ...pre, positionOffsetX: Number(value) }));
  };
  const handleOffsetYChange = (value: number) => {
    update((pre) => ({ ...pre, positionOffsetY: Number(value) }));
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-start items-center space-x-1	">
        <h1 className="text-sm">Placement</h1>
        <HelpTooltip>Controls which corner the {name} should be placed at.</HelpTooltip>
      </div>
      <div className="flex flex-col bg-background-700 p-3.5 rounded-lg space-y-6 mt-2">
        <div className="flex justify-between">
          <PlacementButton
            text="Left Top"
            position={ModalPosition.LeftTop}
            currentPosition={data.position}
            onPositionChange={handleCurrentPositionChange}
          />
          <PlacementButton
            text="Right Top"
            position={ModalPosition.RightTop}
            currentPosition={data.position}
            onPositionChange={handleCurrentPositionChange}
          />
        </div>
        <div className="flex justify-center">
          <PlacementButton
            text="Center"
            position={ModalPosition.Center}
            currentPosition={data.position}
            onPositionChange={handleCurrentPositionChange}
          />
        </div>
        <div className="flex justify-between">
          <PlacementButton
            text="Left Bottom"
            position={ModalPosition.LeftBottom}
            currentPosition={data.position}
            onPositionChange={handleCurrentPositionChange}
          />
          <PlacementButton
            text="Right Bottom"
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
              <Label htmlFor="button-distance-element">The horizontal offset</Label>
              <HelpTooltip>
                How far in pixels from the horizontal edge of the browser window the {name} should
                be positioned.
              </HelpTooltip>
            </div>
            <InputNumber
              defaultNumber={data.positionOffsetX || 0}
              onValueChange={handleOffsetXChange}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <div className="flex space-x-1 justify-start items-center">
              <Label htmlFor="button-distance-element">The vertical offset</Label>
              <HelpTooltip>
                How far in pixels from the vertical edge of the browser window the {name} should be
                positioned.
              </HelpTooltip>
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
