import {
  Attribute,
  Content,
  ContentOmbedInfo,
  ContentVersion,
  RulesCondition,
  Step,
} from '@usertour-ui/types';
import { CSSProperties, ReactNode } from 'react';
import { UseMeasureRect } from 'react-use/lib/useMeasure';
import { Descendant } from 'slate';

type ContentEditorElementWidth = {
  type?: string;
  value?: number;
};

type ContentEditorElementMargin = {
  enabled: boolean;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

export enum ContentEditorElementType {
  TEXT = 'text',
  IMAGE = 'image',
  BUTTON = 'button',
  EMBED = 'embed',
  COLUMN = 'column',
  GROUP = 'group',
  NPS = 'nps',
  STAR_RATING = 'star-rating',
  SCALE = 'scale',
  SINGLE_LINE_TEXT = 'single-line-text',
  MULTI_LINE_TEXT = 'multi-line-text',
  MULTIPLE_CHOICE = 'multiple-choice',
}

export enum ContentEditorSideBarType {
  TOP = 'top',
  RIGHT = 'right',
  BOTTOM = 'bottom',
}

export interface ContentEditorUploadRequestOption {
  onProgress?: (event: { percent?: number }) => void;
  onError?: (event: Error, body?: any) => void;
  onSuccess?: (body: { url: string }) => void;
  file: File;
}

export type ContentEditorUploadFunc = (options: ContentEditorUploadRequestOption) => void;

export type ContentEditorButtonData = {
  type: string;
  text: string;
  action?: string;
  actions: RulesCondition[];
};

export type ContentEditorWidth = {
  type?: string;
  value?: number;
};

export type ContentEditorHeight = {
  type?: string;
  value?: number;
};

export type ContentEditorMargin = {
  enabled: boolean;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

//Image element
export type ContentEditorImageElement = {
  type: ContentEditorElementType.IMAGE;
  url: string;
  width?: ContentEditorElementWidth;
  margin?: ContentEditorElementMargin;
};

//Button element
export type ContentEditorButtonElement = {
  type: ContentEditorElementType.BUTTON;
  data: ContentEditorButtonData;
  margin?: ContentEditorElementMargin;
};

//Text element
export type ContentEditorTextElement = {
  type: ContentEditorElementType.TEXT;
  data: Descendant[];
};

//Column element
export type ContentEditorColumnElement = {
  type: ContentEditorElementType.COLUMN;
  style?: CSSProperties;
  justifyContent?: string;
  alignItems?: string;
  width?: ContentEditorWidth;
};

//Group element
export type ContentEditorGroupElement = {
  type: ContentEditorElementType.GROUP;
};

//Embed element
export type ContentEditorEmebedElement = {
  type: ContentEditorElementType.EMBED;
  url: string;
  parsedUrl?: string;
  oembed?: ContentOmbedInfo;
  width?: ContentEditorWidth;
  margin?: ContentEditorMargin;
  height?: ContentEditorHeight;
};

export type ContentEditorNPSElement = {
  type: ContentEditorElementType.NPS;
  data: {
    cvid: string;
    name: string;
    lowLabel: string;
    highLabel: string;
    actions?: RulesCondition[];
    score?: number;
    bindToAttribute?: boolean;
    selectedAttribute?: string;
  };
};

export type ContentEditorStarRatingElement = {
  type: ContentEditorElementType.STAR_RATING;
  data: {
    cvid: string;
    name: string;
    rating?: number;
    lowRange: number;
    highRange: number;
    lowLabel?: string;
    highLabel?: string;
    actions?: RulesCondition[];
    bindToAttribute?: boolean;
    selectedAttribute?: string;
  };
};

export type ContentEditorScaleElement = {
  type: ContentEditorElementType.SCALE;
  data: {
    cvid: string;
    name: string;
    lowRange: number;
    highRange: number;
    lowLabel?: string;
    highLabel?: string;
    actions?: RulesCondition[];
    bindToAttribute?: boolean;
    selectedAttribute?: string;
  };
};

export interface ContentEditorSingleLineTextElement {
  type: ContentEditorElementType.SINGLE_LINE_TEXT;
  data: {
    cvid: string;
    name: string;
    placeholder: string;
    buttonText: string;
    required: boolean;
    actions?: RulesCondition[];
    bindToAttribute?: boolean;
    selectedAttribute?: string;
  };
}

export interface ContentEditorMultiLineTextElement {
  type: ContentEditorElementType.MULTI_LINE_TEXT;
  data: {
    cvid: string;
    name: string;
    placeholder: string;
    buttonText: string;
    actions?: RulesCondition[];
    required: boolean;
    bindToAttribute?: boolean;
    selectedAttribute?: string;
  };
}
// Define the option type
export interface ContentEditorMultipleChoiceOption {
  label: string;
  value: string;
  checked: boolean;
}

// Define the element type
export interface ContentEditorMultipleChoiceElement {
  type: ContentEditorElementType.MULTIPLE_CHOICE;
  data: {
    cvid: string;
    name: string;
    options: ContentEditorMultipleChoiceOption[];
    shuffleOptions: boolean;
    enableOther: boolean;
    allowMultiple: boolean;
    buttonText?: string;
    actions?: RulesCondition[];
    lowRange?: number;
    highRange?: number;
    bindToAttribute?: boolean;
    selectedAttribute?: string;
  };
}

export type ContentEditorElement =
  | ContentEditorButtonElement
  | ContentEditorImageElement
  | ContentEditorTextElement
  | ContentEditorEmebedElement
  | ContentEditorNPSElement
  | ContentEditorStarRatingElement
  | ContentEditorScaleElement
  | ContentEditorSingleLineTextElement
  | ContentEditorMultiLineTextElement
  | ContentEditorMultipleChoiceElement;

export type ContentEditorQuestionElement =
  | ContentEditorNPSElement
  | ContentEditorStarRatingElement
  | ContentEditorScaleElement
  | ContentEditorSingleLineTextElement
  | ContentEditorMultiLineTextElement
  | ContentEditorMultipleChoiceElement;

export type ContentEditorClickableElement =
  | ContentEditorButtonElement
  | ContentEditorQuestionElement;

export type ContentEditorRootElement = {
  id?: string;
  element: ContentEditorElement;
  children: null;
};
export type ContentEditorRootColumn = {
  id?: string;
  element: ContentEditorColumnElement;
  children: ContentEditorRootElement[];
};
export type ContentEditorRoot = {
  id?: string;
  element: ContentEditorGroupElement;
  children: ContentEditorRootColumn[];
};

export interface ContentEditorProps {
  zIndex: number;
  projectId: string;
  customUploadRequest?: (file: File) => Promise<string>;
  onValueChange?: (value: ContentEditorRoot[]) => void;
  getOembedInfo?: (url: string) => Promise<ContentOmbedInfo>;
  initialValue?: ContentEditorRoot[];
  attributes?: Attribute[];
  contentList?: Content[];
  currentVersion?: ContentVersion;
  currentStep?: Step;
  actionItems?: string[] | undefined;
  createStep?: (currentVersion: ContentVersion, sequence: number) => Promise<Step | undefined>;
  enabledElementTypes?: ContentEditorElementType[];
}

export type ContentEditorContextProviderProps = ContentEditorProps & {
  children: ReactNode;
};

export enum ContentEditorElementInsertDirection {
  RIGHT = 'right',
  LEFT = 'left',
}

export type ContentEditorContextProps = ContentEditorProps & {
  activeId: string | undefined;
  setActiveId: React.Dispatch<React.SetStateAction<string | undefined>>;
  contents: ContentEditorRoot[];
  setContents: React.Dispatch<React.SetStateAction<ContentEditorRoot[]>>;
  isEditorHover: boolean;
  setIsEditorHover: React.Dispatch<React.SetStateAction<boolean>>;
  insertColumnInGroup: (
    element: ContentEditorElement,
    path: number[],
    direction: ContentEditorElementInsertDirection,
  ) => void;
  insertGroupAtTop: (element: ContentEditorElement) => void;
  insertGroupAtBottom: (element: ContentEditorElement) => void;
  insertElementInColumn: (
    element: ContentEditorElement,
    path: number[],
    direction: ContentEditorElementInsertDirection,
  ) => void;
  updateElement: (
    element: ContentEditorElement | ContentEditorColumnElement | ContentEditorGroupElement,
    id: string,
  ) => void;
  deleteElementInColumn: (path: number[]) => void;
  deleteColumn: (path: number[]) => void;
};

export type PopperEditorProps = {
  onPositionChange?: (isBottom: boolean) => void;
  onValueChange?: (value: Descendant[]) => void;
  customUploadRequest?: (file: File) => Promise<string>;
  isBottom?: boolean;
  zIndex: number;
  showToolbar?: boolean;
  initialValue?: Descendant[];
  attributes?: Attribute[];
  isInline?: boolean;
  className?: string;
};

export type PopperEditorContextProps = PopperEditorProps & {
  rect?: UseMeasureRect;
  isEditorHover: boolean;
  setIsEditorHover: React.Dispatch<React.SetStateAction<boolean>>;
  setShowToolbar: React.Dispatch<React.SetStateAction<boolean>>;
  container: HTMLDivElement | null;
};
