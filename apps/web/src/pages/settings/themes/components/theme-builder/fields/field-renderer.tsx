import { InlineAlert } from '@usertour/ui';
import { useTranslation } from 'react-i18next';
import { useBuilderContext } from '../builder-context';
import type { FieldDef } from '../schema/types';
import { AvatarTypeField } from './avatar-type-field';
import { BooleanField } from './boolean-field';
import { ColorField } from './color-field';
import { DynamicNumberField } from './dynamic-number-field';
import { FontFamilyField } from './font-family-field';
import { ImageUploadField } from './image-upload-field';
import { NumberField } from './number-field';
import { PlacementField } from './placement-field';
import { SelectField } from './select-field';
import { SliderField } from './slider-field';
import { SubSection } from './sub-section';
import { TextField } from './text-field';
import { TripleColorField } from './triple-color-field';

export interface FieldRendererProps {
  field: FieldDef;
}

// All `label` values arrive as i18n keys (see schema/sections.ts). FieldRenderer
// is the single resolver — it calls `t()` once per field and passes plain
// strings down so leaf field components don't need to know about i18n.

export function FieldRenderer(props: FieldRendererProps) {
  const { field } = props;
  const { activeSettings } = useBuilderContext();
  const { t } = useTranslation();

  if ('visibleWhen' in field && field.visibleWhen && !field.visibleWhen(activeSettings)) {
    return null;
  }

  // `tooltip` (when set) is also a translation key — resolve once here so leaf
  // field components stay i18n-agnostic, matching the `label` convention.
  const tooltip = 'tooltip' in field && field.tooltip ? t(field.tooltip) : undefined;

  switch (field.type) {
    case 'color':
      return (
        <ColorField
          path={field.path}
          label={t(field.label)}
          allowAuto={field.allowAuto}
          autoFallback={field.autoFallback}
          vertical={field.vertical}
          tooltip={tooltip}
        />
      );
    case 'number':
      return (
        <NumberField
          path={field.path}
          label={t(field.label)}
          min={field.min}
          max={field.max}
          step={field.step}
          suffix={field.suffix}
          optional={field.optional}
          placeholder={field.placeholder ? t(field.placeholder) : undefined}
          // `validate` returns a translation key; resolve it at the consumer layer
          // (NumberField) so error messages also flow through i18n.
          validate={
            field.validate
              ? (v) => {
                  const errorKey = field.validate?.(v);
                  return errorKey ? t(errorKey, { max: 10 }) : undefined;
                }
              : undefined
          }
          tooltip={tooltip}
        />
      );
    case 'slider':
      return (
        <SliderField
          path={field.path}
          label={t(field.label)}
          min={field.min}
          max={field.max}
          step={field.step}
          suffix={field.suffix}
          tooltip={tooltip}
        />
      );
    case 'boolean':
      return <BooleanField path={field.path} label={t(field.label)} tooltip={tooltip} />;
    case 'select':
      return (
        <SelectField
          path={field.path}
          label={t(field.label)}
          options={field.options.map((opt) => ({ value: opt.value, label: t(opt.label) }))}
          vertical={field.vertical}
          valueAsNumber={field.valueAsNumber}
          tooltip={tooltip}
        />
      );
    case 'text':
      return (
        <TextField
          path={field.path}
          label={t(field.label)}
          placeholder={field.placeholder ? t(field.placeholder) : undefined}
          tooltip={tooltip}
        />
      );
    case 'placement':
      return (
        <PlacementField
          path={field.path}
          label={t(field.label)}
          options={field.options?.map((opt) => ({ value: opt.value, label: t(opt.label) }))}
          labels={
            field.labels
              ? {
                  position: field.labels.position ? t(field.labels.position) : undefined,
                  offsetX: field.labels.offsetX ? t(field.labels.offsetX) : undefined,
                  offsetY: field.labels.offsetY ? t(field.labels.offsetY) : undefined,
                }
              : undefined
          }
        />
      );
    case 'font-family':
      return <FontFamilyField path={field.path} label={t(field.label)} tooltip={tooltip} />;
    case 'group-header':
      return <h4 className="pt-2 text-sm font-medium text-foreground">{t(field.label)}</h4>;
    case 'separator':
      return <div className="my-3 h-px w-full bg-border/60" />;
    case 'dynamic-number': {
      // Resolve label + path here so the leaf component takes plain strings.
      const resolvedPath = field.getPath(activeSettings);
      const resolvedLabel = t(field.getLabel(activeSettings));
      return (
        <DynamicNumberField
          label={resolvedLabel}
          path={resolvedPath}
          min={field.min}
          max={field.max}
          step={field.step}
          suffix={field.suffix}
          tooltip={tooltip}
        />
      );
    }
    case 'triple-color':
      return (
        <TripleColorField
          paths={field.paths}
          labels={[t(field.labels[0]), t(field.labels[1]), t(field.labels[2])]}
          allowAuto={field.allowAuto}
        />
      );
    case 'sub-section':
      if (field.visibleWhen && !field.visibleWhen(activeSettings)) return null;
      return (
        <SubSection
          label={field.label ? t(field.label) : undefined}
          fields={field.fields}
          withSeparator={field.withSeparator}
        />
      );
    case 'inline-alert':
      if (!field.visibleWhen(activeSettings)) return null;
      return <InlineAlert message={t(field.message)} variant={field.variant} />;
    case 'avatar-type':
      return <AvatarTypeField basePath={field.basePath} />;
    case 'image-upload':
      return (
        <ImageUploadField
          path={field.path}
          label={field.label ? t(field.label) : ''}
          description={field.description ? t(field.description) : undefined}
          maxSizeBytes={field.maxSizeBytes}
          previewAspect={field.previewAspect}
        />
      );
  }
}
