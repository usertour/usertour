import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { FieldRenderer } from '../fields/field-renderer';
import { builderSections } from '../schema/sections';

interface Props {
  getField: <T = unknown>(path: string) => T | undefined;
  setField: (path: string, value: unknown) => void;
  // Called with the section id when a previously-collapsed section is opened.
  // Used to sync the widget preview to that section's previewWidget.
  onSectionExpanded?: (sectionId: string) => void;
}

export function SectionsAccordion({ getField, setField, onSectionExpanded }: Props) {
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
              <MinusIcon className="hidden h-4 w-4 shrink-0 text-muted-foreground group-data-[state=open]:block" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="space-y-3 px-5 py-4">
              {section.fields.map((field) => (
                <FieldRenderer
                  key={`${field.type}:${field.path}`}
                  field={field}
                  getField={getField}
                  setField={setField}
                />
              ))}
            </div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
