import { BaseEditor, Descendant } from 'slate';
import { HistoryEditor } from 'slate-history';
import { ReactEditor } from 'slate-react';

export type PlainElementType = {
  type: 'paragraph';
  align?: string;
  children: Descendant[];
};

export type H1ElementType = {
  type: 'h1';
  align?: string;
  children: Descendant[];
};

export type H2ElementType = {
  type: 'h2';
  align?: string;
  children: Descendant[];
};

export type BulletedListElementType = {
  type: 'bulleted-list';
  align?: string;
  children: ItemListElementType[];
};

export type NumberedListElementType = {
  type: 'numbered-list';
  align?: string;
  children: ItemListElementType[];
};

export type ItemListElementType = {
  type: 'list-item';
  align?: string;
  children: Descendant[];
};

export type CodeElementType = {
  type: 'code';
  align?: string;
  children: Descendant[];
};

export type UserAttributeElementType = {
  type: 'user-attribute';
  attrCode: string;
  fallback: string;
  value?: string;
  children: Descendant[];
};

export type LinkElementType = {
  type: 'link';
  data?: Descendant[];
  url?: string;
  openType?: string;
  children: Descendant[];
};

export type SlashInputElementType = {
  type: 'slash-input';
  children: Descendant[];
};

type CustomElement =
  | H1ElementType
  | H2ElementType
  | CodeElementType
  | BulletedListElementType
  | NumberedListElementType
  | ItemListElementType
  | UserAttributeElementType
  | LinkElementType
  | SlashInputElementType
  | PlainElementType;

export type CustomElementStrings = CustomElement['type'];

export type CustomMarkup = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  code: boolean;
};

export type CustomMarkupStrings = keyof CustomMarkup;

// Text formatting types (marks)
export type TextFormat = 'bold' | 'italic' | 'underline' | 'color';

// Text alignment types
export type TextAlignFormat = 'left' | 'center' | 'right' | 'justify';

// Block formatting types (includes element types and alignment)
export type BlockFormat = CustomElementStrings | TextAlignFormat;

// Combined format type for toolbar buttons
export type FormatType = TextFormat | BlockFormat;

export type CustomText = Partial<CustomMarkup> & {
  text: string;
  placeholder?: boolean;
  align?: string;
  color?: string;
};

export type CustomEditor = BaseEditor & ReactEditor & HistoryEditor;

declare module 'slate' {
  // eslint-disable-next-line no-unused-vars
  interface CustomTypes {
    Editor: CustomEditor;
    Element: CustomElement;
    Text: CustomText;
  }
  export interface BaseElement {
    type: CustomElementStrings;
  }
}

export interface UploadRequestOption {
  onProgress?: (event: { percent?: number }) => void;
  onError?: (event: Error, body?: any) => void;
  onSuccess?: (body: { url: string }) => void;
  file: File;
}
export type UploadFunc = (options: UploadRequestOption) => void;
