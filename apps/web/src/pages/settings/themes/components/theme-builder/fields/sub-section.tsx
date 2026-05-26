import type { FieldDef } from '../schema/types';
import { FieldRenderer } from './field-renderer';

export interface SubSectionProps {
  label?: string;
  fields: FieldDef[];
  withSeparator?: boolean;
}

export const SubSection = (props: SubSectionProps) => {
  const { label, fields, withSeparator } = props;
  return (
    <>
      {withSeparator && <div className="my-3 h-px w-full bg-border/60" />}
      <div className="space-y-3">
        {label && <h4 className="text-sm font-semibold text-foreground">{label}</h4>}
        {fields.map((field, index) => (
          <FieldRenderer key={fieldKey(field, index)} field={field} />
        ))}
      </div>
    </>
  );
};

// Stable key for nested fields. Mirrors SectionsAccordion's heuristic.
function fieldKey(field: FieldDef, index: number): string {
  if (
    field.type === 'group-header' ||
    field.type === 'inline-alert' ||
    field.type === 'sub-section' ||
    field.type === 'separator'
  ) {
    return `${field.type}:${index}`;
  }
  if (field.type === 'triple-color') {
    return `${field.type}:${field.paths.join('|')}`;
  }
  if (field.type === 'dynamic-number') {
    return `${field.type}:${index}`;
  }
  if (field.type === 'avatar-type') {
    return `${field.type}:${field.basePath}`;
  }
  return `${field.type}:${field.path}`;
}
