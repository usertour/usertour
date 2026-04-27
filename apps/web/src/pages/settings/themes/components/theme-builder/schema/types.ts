import type { ThemeDetailPreviewType } from '@usertour/types';

export type FieldDef =
  | { type: 'color'; path: string; label: string; allowAuto?: boolean }
  | {
      type: 'number';
      path: string;
      label: string;
      min?: number;
      max?: number;
      step?: number;
      suffix?: string;
    }
  | {
      type: 'slider';
      path: string;
      label: string;
      min: number;
      max: number;
      step?: number;
      suffix?: string;
    }
  | { type: 'boolean'; path: string; label: string }
  | {
      type: 'select';
      path: string;
      label: string;
      options: { value: string; label: string }[];
    }
  | { type: 'text'; path: string; label: string; placeholder?: string }
  | { type: 'placement'; path: string; label: string }
  | { type: 'font-family'; path: string; label: string };

export interface BuilderSection {
  id: string;
  label: string;
  previewWidget: ThemeDetailPreviewType;
  fields: FieldDef[];
}
