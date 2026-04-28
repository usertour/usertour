import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { PlusIcon, RiSubtractLine } from '@usertour-packages/icons';
import { useState } from 'react';
import { FieldRenderer } from '../fields/field-renderer';
import type { FieldDef } from '../schema/types';
import { builderSections } from '../schema/sections';

interface Props {
  // Called with the section id when a previously-collapsed section is opened.
  // Used to sync the widget preview to that section's previewWidget.
  onSectionExpanded?: (sectionId: string) => void;
}

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

export function SectionsAccordion({ onSectionExpanded }: Props) {
  const [expanded, setExpanded] = useState<string[]>([]);

  const handleValueChange = (values: string[]) => {
    const added = values.find((v) => !expanded.includes(v));
    if (added && onSectionExpanded) onSectionExpanded(added);
    setExpanded(values);
  };

  return (
    <AccordionPrimitive.Root
      type="multiple"
      value={expanded}
      onValueChange={handleValueChange}
      className="px-2 py-2"
    >
      {builderSections.map((section) => (
        <AccordionPrimitive.Item
          key={section.id}
          value={section.id}
          className="border-b border-border/60 last:border-b-0"
        >
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between px-3 py-2.5 text-xs font-semibold text-foreground">
              <span className="truncate text-left">{section.label}</span>
              <PlusIcon className="h-4 w-4 shrink-0 text-muted-foreground group-data-[state=open]:hidden" />
              <RiSubtractLine className="hidden h-4 w-4 shrink-0 text-muted-foreground group-data-[state=open]:block" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="space-y-3 px-5 py-4">
              {section.fields.map((field, index) => (
                <FieldRenderer key={fieldKey(field, index)} field={field} />
              ))}
            </div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
