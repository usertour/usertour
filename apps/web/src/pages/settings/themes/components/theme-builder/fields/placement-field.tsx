import { sectionLabelClass } from '@usertour/ui';
import { ModalPosition } from '@usertour/types';
import { useTranslation } from 'react-i18next';
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
  // Bounds applied to both offset inputs; message pre-translated by FieldRenderer.
  offsetMin?: number;
  offsetMax?: number;
  offsetRangeMessage?: string;
}

export const PlacementField = (props: PlacementFieldProps) => {
  const { path, label, options, labels, offsetMin, offsetMax, offsetRangeMessage } = props;
  const { t } = useTranslation();

  const defaultOptions: { value: string; label: string }[] = [
    {
      value: ModalPosition.LeftTop,
      label: t('themeBuilder.options.placementCornerCenter.topLeft'),
    },
    {
      value: ModalPosition.CenterTop,
      label: t('themeBuilder.options.placementCornerCenter.topCenter'),
    },
    {
      value: ModalPosition.RightTop,
      label: t('themeBuilder.options.placementCornerCenter.topRight'),
    },
    {
      value: ModalPosition.LeftBottom,
      label: t('themeBuilder.options.placementCornerCenter.bottomLeft'),
    },
    {
      value: ModalPosition.CenterBottom,
      label: t('themeBuilder.options.placementCornerCenter.bottomCenter'),
    },
    {
      value: ModalPosition.RightBottom,
      label: t('themeBuilder.options.placementCornerCenter.bottomRight'),
    },
    { value: ModalPosition.Center, label: t('themeBuilder.options.placementCornerCenter.center') },
  ];

  const opts = options ?? defaultOptions;
  const lbls = {
    position: labels?.position ?? t('themeBuilder.fields.common.placement'),
    offsetX: labels?.offsetX ?? t('themeBuilder.fields.common.offsetX'),
    offsetY: labels?.offsetY ?? t('themeBuilder.fields.common.offsetY'),
  };
  return (
    <div className="space-y-1">
      <div className={sectionLabelClass}>{label}</div>
      <SelectField path={`${path}.position`} label={lbls.position} options={opts} />
      <NumberField
        path={`${path}.positionOffsetX`}
        label={lbls.offsetX}
        min={offsetMin}
        max={offsetMax}
        rangeMessage={offsetRangeMessage}
        suffix="px"
      />
      <NumberField
        path={`${path}.positionOffsetY`}
        label={lbls.offsetY}
        min={offsetMin}
        max={offsetMax}
        rangeMessage={offsetRangeMessage}
        suffix="px"
      />
    </div>
  );
};
