import { ModalPosition } from '@usertour/types';
import { sectionLabelClass } from '../ui/tokens';
import { NumberField } from './number-field';
import { SelectField } from './select-field';

export interface PlacementValue {
  position: ModalPosition;
  positionOffsetX: number;
  positionOffsetY: number;
}

interface Props {
  value: Partial<PlacementValue> | undefined;
  onChange: (next: Partial<PlacementValue>) => void;
  label: string;
}

const POSITION_OPTIONS = [
  { value: ModalPosition.LeftTop, label: 'Top left' },
  { value: ModalPosition.CenterTop, label: 'Top center' },
  { value: ModalPosition.RightTop, label: 'Top right' },
  { value: ModalPosition.LeftBottom, label: 'Bottom left' },
  { value: ModalPosition.CenterBottom, label: 'Bottom center' },
  { value: ModalPosition.RightBottom, label: 'Bottom right' },
  { value: ModalPosition.Center, label: 'Center' },
];

export function PlacementField({ value, onChange, label }: Props) {
  return (
    <div className="space-y-1">
      <div className={sectionLabelClass}>{label}</div>
      <SelectField
        label="Anchor"
        value={value?.position}
        onChange={(next) => onChange({ position: next as ModalPosition })}
        options={POSITION_OPTIONS}
      />
      <NumberField
        label="Offset X"
        value={value?.positionOffsetX}
        onChange={(next) => onChange({ positionOffsetX: next })}
        suffix="px"
      />
      <NumberField
        label="Offset Y"
        value={value?.positionOffsetY}
        onChange={(next) => onChange({ positionOffsetY: next })}
        suffix="px"
      />
    </div>
  );
}
