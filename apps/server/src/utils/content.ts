import { createId } from '@paralleldrive/cuid2';

export type ContentEditorNPSElement = {
  type: ContentEditorElementType.NPS;
  data: {
    cvid: string;
    name: string;
    lowLabel: string;
    highLabel: string;
    actions?: any;
    score?: number;
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
    actions?: any;
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
    actions?: any;
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
    actions?: any;
  };
}

export interface ContentEditorMultiLineTextElement {
  type: ContentEditorElementType.MULTI_LINE_TEXT;
  data: {
    cvid: string;
    name: string;
    placeholder: string;
    buttonText: string;
    actions?: any;
    required: boolean;
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
    actions?: any;
    lowRange?: number;
    highRange?: number;
  };
}
export type QuestionElement =
  | ContentEditorNPSElement
  | ContentEditorStarRatingElement
  | ContentEditorScaleElement
  | ContentEditorSingleLineTextElement
  | ContentEditorMultiLineTextElement
  | ContentEditorMultipleChoiceElement;

interface GroupElement {
  type: string;
  data?: any;
  children?: any[];
}

export interface GroupItem {
  element: GroupElement | QuestionElement;
  children: GroupItem[] | null;
}

export enum ContentEditorElementType {
  NPS = 'nps',
  STAR_RATING = 'star-rating',
  SCALE = 'scale',
  SINGLE_LINE_TEXT = 'single-line-text',
  MULTI_LINE_TEXT = 'multi-line-text',
  MULTIPLE_CHOICE = 'multiple-choice',
}

export const questionTypes = [
  ContentEditorElementType.NPS,
  ContentEditorElementType.STAR_RATING,
  ContentEditorElementType.SCALE,
  ContentEditorElementType.SINGLE_LINE_TEXT,
  ContentEditorElementType.MULTI_LINE_TEXT,
  ContentEditorElementType.MULTIPLE_CHOICE,
];

export const numberQuestionTypes = [
  ContentEditorElementType.SCALE,
  ContentEditorElementType.STAR_RATING,
  ContentEditorElementType.NPS,
];

export const aggregationQuestionTypes = [
  ContentEditorElementType.MULTIPLE_CHOICE,
  ...numberQuestionTypes,
];

/**
 * Extract question data from step if it's a valid question for analytics
 */
export function extractQuestionForAnalytics(step: any) {
  const questionData = extractQuestionData(step.data as unknown as GroupItem[]);
  if (questionData.length === 0) return null;

  const question = questionData[0];
  if (!aggregationQuestionTypes.includes(question.type)) return null;

  return question;
}

export function extractQuestionData(data: GroupItem[]): QuestionElement[] {
  const result: QuestionElement[] = [];
  // Helper function to recursively search through the data
  function traverse(item: GroupItem) {
    // Check if current element has type "multiple-choice"
    if (questionTypes.includes(item.element.type as ContentEditorElementType)) {
      result.push(item.element as QuestionElement);
    }

    // Recursively check children if they exist
    if (item.children) {
      for (const child of item.children) {
        traverse(child);
      }
    }
  }

  // Process each item in the root array
  for (const item of data) {
    traverse(item);
  }

  return result;
}

// Process step data recursively
export function processStepData(data: any): any {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map((item) => processStepData(item));
  }

  if (typeof data === 'object') {
    const newData = { ...data };
    if (
      newData.element &&
      questionTypes.includes(newData.element.type) &&
      newData.element.data?.cvid
    ) {
      newData.element.data.cvid = createId();
    }

    // Process children recursively
    if (newData.children) {
      newData.children = processStepData(newData.children);
    }
    return newData;
  }

  return data;
}
