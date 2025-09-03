import {
  Step,
  ContentEditorElementType,
  ContentEditorQuestionElement,
  ContentEditorRoot,
} from '@usertour/types';

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
export const extractQuestionForAnalytics = (step: Step) => {
  const questionData = extractQuestionData(step.data as unknown as ContentEditorRoot[]);
  if (questionData.length === 0) return null;

  const question = questionData[0];
  if (!aggregationQuestionTypes.includes(question.type)) return null;

  return question;
};

/**
 * Extract bindToAttribute from step if it's a valid question for analytics
 */
export const extractBindToAttribute = (step: Step): string | null => {
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
 * Extract question data from step
 */
export const extractQuestionData = (data: ContentEditorRoot[]): ContentEditorQuestionElement[] => {
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
