import { useBuilderContext } from '../builder-context';
import type { FieldDef } from '../schema/types';
import { AvatarTypeField } from './avatar-type-field';
import { BooleanField } from './boolean-field';
import { ColorField } from './color-field';
import { DynamicNumberField } from './dynamic-number-field';
import { FontFamilyField } from './font-family-field';
import { ImageUploadField } from './image-upload-field';
import { InlineAlert } from './inline-alert';
import { NumberField } from './number-field';
import { PlacementField } from './placement-field';
import { SelectField } from './select-field';
import { SliderField } from './slider-field';
import { SubSection } from './sub-section';
import { TextField } from './text-field';
import { TripleColorField } from './triple-color-field';

interface Props {
  field: FieldDef;
}

export function FieldRenderer({ field }: Props) {
  const { activeSettings } = useBuilderContext();

  // group-header / sub-section / inline-alert handle their own visibility.
  if ('visibleWhen' in field && field.visibleWhen && !field.visibleWhen(activeSettings)) {
    return null;
  }

  switch (field.type) {
    case 'color':
      return (
        <ColorField
          path={field.path}
          label={field.label}
          allowAuto={field.allowAuto}
          autoFallback={field.autoFallback}
          vertical={field.vertical}
        />
      );
    case 'number':
      return (
        <NumberField
          path={field.path}
          label={field.label}
          min={field.min}
          max={field.max}
          step={field.step}
          suffix={field.suffix}
          optional={field.optional}
          placeholder={field.placeholder}
          validate={field.validate}
        />
      );
    case 'slider':
      return (
        <SliderField
          path={field.path}
          label={field.label}
          min={field.min}
          max={field.max}
          step={field.step}
          suffix={field.suffix}
        />
      );
    case 'boolean':
      return <BooleanField path={field.path} label={field.label} />;
    case 'select':
      return (
        <SelectField
          path={field.path}
          label={field.label}
          options={field.options}
          vertical={field.vertical}
          valueAsNumber={field.valueAsNumber}
        />
      );
    case 'text':
      return <TextField path={field.path} label={field.label} placeholder={field.placeholder} />;
    case 'placement':
      return (
        <PlacementField
          path={field.path}
          label={field.label}
          options={field.options}
          labels={field.labels}
        />
      );
    case 'font-family':
      return <FontFamilyField path={field.path} label={field.label} />;
    case 'group-header':
      return <h4 className="pt-2 text-xs font-medium text-foreground">{field.label}</h4>;
    case 'separator':
      return <div className="my-3 h-px w-full bg-border/60" />;
    case 'dynamic-number':
      return (
        <DynamicNumberField
          getLabel={field.getLabel}
          getPath={field.getPath}
          min={field.min}
          max={field.max}
          step={field.step}
          suffix={field.suffix}
        />
      );
    case 'triple-color':
      return (
        <TripleColorField paths={field.paths} labels={field.labels} allowAuto={field.allowAuto} />
      );
    case 'sub-section':
      if (field.visibleWhen && !field.visibleWhen(activeSettings)) return null;
      return (
        <SubSection label={field.label} fields={field.fields} withSeparator={field.withSeparator} />
      );
    case 'inline-alert':
      if (!field.visibleWhen(activeSettings)) return null;
      return <InlineAlert message={field.message} variant={field.variant} />;
    case 'avatar-type':
      return <AvatarTypeField basePath={field.basePath} />;
    case 'image-upload':
      return (
        <ImageUploadField
          path={field.path}
          label={field.label}
          description={field.description}
          maxSizeBytes={field.maxSizeBytes}
          previewAspect={field.previewAspect}
        />
      );
  }
}
