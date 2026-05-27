import { sectionLabelClass } from '@usertour/ui';
import { ModalPosition } from '@usertour/types';
import { NumberField } from './number-field';
import { SelectField } from './select-field';

export interface PlacementValue {
  position: ModalPosition;
  positionOffsetX: number;
  positionOffsetY: number;
}

export interface PlacementFieldProps {
  path: string;
  label: string;
  options?: { value: string; label: string }[];
  labels?: { position?: string; offsetX?: string; offsetY?: string };
}

const DEFAULT_OPTIONS: { value: string; label: string }[] = [
  { value: ModalPosition.LeftTop, label: 'Top left' },
  { value: ModalPosition.CenterTop, label: 'Top center' },
  { value: ModalPosition.RightTop, label: 'Top right' },
  { value: ModalPosition.LeftBottom, label: 'Bottom left' },
  { value: ModalPosition.CenterBottom, label: 'Bottom center' },
  { value: ModalPosition.RightBottom, label: 'Bottom right' },
  { value: ModalPosition.Center, label: 'Center' },
];

export const PlacementField = (props: PlacementFieldProps) => {
  const { path, label, options, labels } = props;
  const opts = options ?? DEFAULT_OPTIONS;
  const lbls = {
    position: labels?.position ?? 'Anchor',
    offsetX: labels?.offsetX ?? 'Offset X',
    offsetY: labels?.offsetY ?? 'Offset Y',
  };
  return (
    <div className="space-y-1">
      <div className={sectionLabelClass}>{label}</div>
      <SelectField path={`${path}.position`} label={lbls.position} options={opts} />
      <NumberField path={`${path}.positionOffsetX`} label={lbls.offsetX} suffix="px" />
      <NumberField path={`${path}.positionOffsetY`} label={lbls.offsetY} suffix="px" />
    </div>
  );
};
