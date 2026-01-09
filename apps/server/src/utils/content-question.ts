import {
  ContentEditorElement,
  ContentEditorElementType,
  ContentEditorQuestionElement,
  ContentEditorRoot,
} from '@usertour/types';
import { Step } from '@/common/types';

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
 * Extract the first question from step if it matches the specified question types
 */
export const extractStepQuestion = (
  step: Step,
  types: ContentEditorElementType[] = aggregationQuestionTypes,
) => {
  if (!step.data) return null;
  const questionData = extractQuestionData(step.data as unknown as ContentEditorRoot[]);
  if (questionData.length === 0) return null;

  const question = questionData[0];
  if (!types.includes(question.type)) return null;

  return question;
};

/**
 * Extract bindToAttribute from step if it's a valid question for analytics
 */
export const extractBindToAttribute = (step: Step): string | null => {
  if (!step.data) return null;
  const questionData = extractQuestionData(step.data as unknown as ContentEditorRoot[]);
  if (questionData.length === 0) return null;

  const question = questionData[0];

  // Check if bindToAttribute is true and return selectedAttribute, otherwise return null
  if (question.data?.bindToAttribute === true) {
    return question.data?.selectedAttribute || null;
  }

  return null;
};

/**
 * Extract bindToAttribute from step if it's a valid question for analytics
 * @param steps - The steps to extract the bindToAttribute from
 * @param questionCvid - The question CVID to extract the bindToAttribute from
 * @returns The bindToAttribute or null if not found
 */
export const extractStepBindToAttribute = (steps: Step[], questionCvid: string): string | null => {
  for (const step of steps) {
    if (!step.data) continue;
    const questions = extractQuestionData(step.data as unknown as ContentEditorRoot[]);
    const question = questions.find((question) => question.data?.cvid === questionCvid);
    if (question?.data?.bindToAttribute === true) {
      return question.data?.selectedAttribute || null;
    }
  }
  return null;
};

/**
 * Check if the element is a question element
 * @param element - The element to check
 * @returns True if the element is a question element, false otherwise
 */
export const isQuestionElement = (element: ContentEditorElement) => {
  return questionTypes.includes(element.type as ContentEditorElementType);
};

/**
 * Extract question data from step
 */
export const extractQuestionData = (data: ContentEditorRoot[]): ContentEditorQuestionElement[] => {
  if (!data || !Array.isArray(data)) {
    return [];
  }
  const result: ContentEditorQuestionElement[] = [];
  // Helper function to recursively search through the data
  function traverse(item: ContentEditorRoot) {
    // Check if current element has type "multiple-choice"
    if (questionTypes.includes(item.element.type as ContentEditorElementType)) {
      result.push(item.element as unknown as ContentEditorQuestionElement);
    }

    // Recursively check children if they exist
    if (item.children) {
      for (const child of item.children) {
        traverse(child as unknown as ContentEditorRoot);
      }
    }
  }

  // Process each item in the root array
  for (const item of data) {
    traverse(item);
  }

  return result;
};
