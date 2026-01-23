import {
  Attribute,
  Content,
  ContentEditorColumnElement,
  ContentEditorElement,
  ContentEditorGroupElement,
  ContentOmbedInfo,
  ContentVersion,
  Step,
  ContentEditorElementType,
  ContentEditorRoot,
} from '@usertour/types';
import { ReactNode } from 'react';
import { UseMeasureRect } from 'react-use/lib/useMeasure';
import { Descendant } from 'slate';
export { ContentEditorElementType, ContentEditorSideBarType } from '@usertour/types';
export type {
  ContentEditorUploadRequestOption,
  ContentEditorUploadFunc,
  ContentEditorButtonData,
  ContentEditorWidth,
  ContentEditorHeight,
  ContentEditorMargin,
  ContentEditorImageElement,
  ContentEditorButtonElement,
  ContentEditorTextElement,
  ContentEditorColumnElement,
  ContentEditorGroupElement,
  ContentEditorEmebedElement,
  ContentEditorNPSElement,
  ContentEditorStarRatingElement,
  ContentEditorScaleElement,
  ContentEditorSingleLineTextElement,
  ContentEditorMultiLineTextElement,
  ContentEditorMultipleChoiceElement,
  ContentEditorMultipleChoiceOption,
  ContentEditorElement,
  ContentEditorQuestionElement,
  ContentEditorClickableElement,
  ContentEditorRootElement,
  ContentEditorRootColumn,
  ContentEditorRoot,
} from '@usertour/types';

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
  createStep?: (
    currentVersion: ContentVersion,
    sequence: number,
    stepType?: string,
    duplicateStep?: Step,
  ) => Promise<Step | undefined>;
  enabledElementTypes?: ContentEditorElementType[];
}

export type ContentEditorContextProviderProps = ContentEditorProps & {
  children: ReactNode;
};

export enum ContentEditorElementInsertDirection {
  RIGHT = 'right',
  LEFT = 'left',
}

// Drop preview type for Notion-style drag indicator
export type DropPreviewType = 'column' | 'group';

// Drop preview state for Notion-style drag indicator
export interface DropPreview {
  type: DropPreviewType;
  containerId: string;
  insertIndex: number;
}

export type ContentEditorContextProps = ContentEditorProps & {
  activeId: string | undefined;
  setActiveId: React.Dispatch<React.SetStateAction<string | undefined>>;
  contents: ContentEditorRoot[];
  setContents: React.Dispatch<React.SetStateAction<ContentEditorRoot[]>>;
  isEditorHover: boolean;
  setIsEditorHover: React.Dispatch<React.SetStateAction<boolean>>;
  dropPreview: DropPreview | null;
  setDropPreview: React.Dispatch<React.SetStateAction<DropPreview | null>>;
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
