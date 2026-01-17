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

export type QuoteElementType = {
  type: 'quote';
  children: Descendant[];
};

export type DividerElementType = {
  type: 'divider';
  children: Descendant[];
};

export type TodoElementType = {
  type: 'todo';
  children: Descendant[];
};

export type GroupElementType = {
  type: 'group';
  isFirst: boolean;
  isLast: boolean;
  children: ColumnElementType[];
};

type ButtonData = {
  type: string;
  text: string;
  action: string;
};
export type ButtonElementType = {
  type: 'button';
  data: ButtonData;
  children: Descendant[];
};

type ElementWidth = {
  type?: string;
  value?: number;
};

type ElementMargin = {
  enabled: boolean;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

export type ColumnElementType = {
  type: 'column';
  style?: CSSProperties;
  width?: ElementWidth;
  children: Descendant[];
};

export type ImageElementType = {
  type: 'image';
  url: string;
  width?: ElementWidth;
  margin?: ElementMargin;
  children: Descendant[];
};

export type EmbedElementType = {
  type: 'embed';
  url: string;
  parsedUrl?: string;
  width?: ElementWidth;
  margin?: ElementMargin;
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

type CustomElement =
  | H1ElementType
  | H2ElementType
  | CodeElementType
  | QuoteElementType
  | DividerElementType
  | BulletedListElementType
  | NumberedListElementType
  | ButtonElementType
  | ItemListElementType
  | GroupElementType
  | ColumnElementType
  | TodoElementType
  | ImageElementType
  | EmbedElementType
  | UserAttributeElementType
  | LinkElementType
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
