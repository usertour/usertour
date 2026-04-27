import type { FieldDef } from '../schema/types';
import { BooleanField } from './boolean-field';
import { ColorField } from './color-field';
import { FontFamilyField } from './font-family-field';
import { NumberField } from './number-field';
import { PlacementField, type PlacementValue } from './placement-field';
import { SelectField } from './select-field';
import { SliderField } from './slider-field';
import { TextField } from './text-field';

interface Props {
  field: FieldDef;
  getField: <T = unknown>(path: string) => T | undefined;
  setField: (path: string, value: unknown) => void;
}

export function FieldRenderer({ field, getField, setField }: Props) {
  switch (field.type) {
    case 'color':
      return (
        <ColorField
          label={field.label}
          allowAuto={field.allowAuto}
          value={getField<string>(field.path) ?? ''}
          onChange={(next) => setField(field.path, next)}
        />
      );
    case 'number':
      return (
        <NumberField
          label={field.label}
          min={field.min}
          max={field.max}
          step={field.step}
          suffix={field.suffix}
          value={getField<number>(field.path)}
          onChange={(next) => setField(field.path, next)}
        />
      );
    case 'slider':
      return (
        <SliderField
          label={field.label}
          min={field.min}
          max={field.max}
          step={field.step}
          suffix={field.suffix}
          value={getField<number>(field.path)}
          onChange={(next) => setField(field.path, next)}
        />
      );
    case 'boolean':
      return (
        <BooleanField
          label={field.label}
          value={getField<boolean>(field.path)}
          onChange={(next) => setField(field.path, next)}
        />
      );
    case 'select':
      return (
        <SelectField
          label={field.label}
          options={field.options}
          value={getField<string>(field.path)}
          onChange={(next) => setField(field.path, next)}
        />
      );
    case 'text':
      return (
        <TextField
          label={field.label}
          placeholder={field.placeholder}
          value={getField<string>(field.path)}
          onChange={(next) => setField(field.path, next)}
        />
      );
    case 'placement':
      return (
        <PlacementField
          label={field.label}
          value={getField<Partial<PlacementValue>>(field.path)}
          onChange={(patch) => {
            for (const [key, val] of Object.entries(patch)) {
              setField(`${field.path}.${key}`, val);
            }
          }}
        />
      );
    case 'font-family':
      return (
        <FontFamilyField
          label={field.label}
          value={getField<string>(field.path)}
          onChange={(next) => setField(field.path, next)}
        />
      );
  }
}
