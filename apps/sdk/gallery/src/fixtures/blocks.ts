import {
  type ContentEditorElement,
  ContentEditorElementType,
  type ContentEditorRoot,
  type RulesCondition,
} from '@usertour/types';
import { button, paragraph, row } from './content';

// Question blocks as the builder seeds them (packages/editor/src/utils/config.ts),
// filled in the way an author would.

const options = [
  { label: 'Daily', value: 'daily', checked: false },
  { label: 'Weekly', value: 'weekly', checked: false },
  { label: 'Monthly', value: 'monthly', checked: false },
];

/** Picking a question type in the builder mints a cvid; any stable string stands in. */
const choice = (cvid: string, name: string, allowMultiple: boolean): ContentEditorElement => ({
  type: ContentEditorElementType.MULTIPLE_CHOICE,
  data: {
    cvid,
    name,
    options: structuredClone(options),
    shuffleOptions: false,
    enableOther: false,
    allowMultiple,
  },
});

export const questions: Record<string, ContentEditorElement> = {
  nps: {
    type: ContentEditorElementType.NPS,
    data: {
      cvid: 'q-nps',
      name: 'How likely are you to recommend us?',
      lowLabel: '',
      highLabel: '',
    },
  },
  star: {
    type: ContentEditorElementType.STAR_RATING,
    data: { cvid: 'q-star', name: 'Rate this feature', lowRange: 1, highRange: 5 },
  },
  scale: {
    type: ContentEditorElementType.SCALE,
    data: { cvid: 'q-scale', name: 'How easy was setup?', lowRange: 1, highRange: 5 },
  },
  single: choice('q-single', 'How often do you report?', false),
  multi: choice('q-multi', 'Which reports do you use?', true),
  text: {
    type: ContentEditorElementType.SINGLE_LINE_TEXT,
    data: {
      cvid: 'q-text',
      name: 'Your role',
      placeholder: 'e.g. Designer',
      buttonText: '',
      required: false,
    },
  },
  textarea: {
    type: ContentEditorElementType.MULTI_LINE_TEXT,
    data: {
      cvid: 'q-textarea',
      name: 'Anything else?',
      placeholder: '',
      buttonText: '',
      required: false,
    },
  },
};

/** A question on its own, the way a survey step holds it. */
export const questionContent = (kind: string): ContentEditorRoot[] => {
  const question = questions[kind];
  if (!question) {
    throw new Error(`Unknown question kind "${kind}"; known: ${Object.keys(questions)}`);
  }
  return [row(paragraph(`Question: ${kind}`)), row(structuredClone(question))];
};

/** Two single-choice questions with identical options in one step. */
export const twoChoiceQuestions: ContentEditorRoot[] = [
  row(choice('q-first', 'First question', false)),
  row(choice('q-second', 'Second question', false)),
];

/** A condition the SDK has already evaluated to `actived`. */
const evaluated = (actived: boolean): RulesCondition[] => [
  { id: `always-${actived}`, type: 'user-attr', data: {}, actived },
];

/** One row of buttons covering each disable/hide rule. */
export const conditionalButtons: ContentEditorRoot[] = [
  row(
    button('Plain'),
    {
      type: ContentEditorElementType.BUTTON,
      data: {
        text: 'Disabled',
        type: 'primary',
        actions: [],
        disableButton: true,
        disableButtonConditions: evaluated(true),
      },
    },
    {
      type: ContentEditorElementType.BUTTON,
      data: {
        text: 'Hidden',
        type: 'primary',
        actions: [],
        hideButton: true,
        hideButtonConditions: evaluated(true),
      },
    },
    {
      type: ContentEditorElementType.BUTTON,
      data: {
        text: 'Kept',
        type: 'primary',
        actions: [],
        hideButton: true,
        hideButtonConditions: evaluated(false),
      },
    },
  ),
];

/** A user-attribute chip as the builder inserts it. */
const attribute = (attrCode: string, fallback: string) => ({
  type: 'user-attribute',
  attrCode,
  fallback,
  children: [{ text: '' }],
});

/** A link whose URL is a template, as the builder's link popover saves it (no stored url). */
const link = (text: string, template: unknown[]) => ({
  type: 'link',
  openType: 'new',
  data: [{ type: 'paragraph', children: template }],
  children: [{ text }],
});

/** Images with and without alt text, attribute interpolation and links. */
export const richContent: ContentEditorRoot[] = [
  row({
    type: ContentEditorElementType.TEXT,
    data: [
      {
        type: 'paragraph',
        children: [
          { text: 'Hi ' },
          attribute('first_name', 'friend'),
          { text: ', you are on the ' },
          attribute('plan', 'free'),
          { text: ' plan.' },
        ],
      },
      {
        type: 'paragraph',
        children: [
          link('Your profile', [
            { text: 'https://example.com/users/' },
            attribute('user_id', 'anonymous'),
          ]),
          { text: ' · ' },
          link('Your team', [{ text: 'https://example.com/teams/' }, attribute('team_id', 'none')]),
        ],
      },
    ],
  }),
  row({
    type: ContentEditorElementType.IMAGE,
    url: '/fixtures/photo.png',
    alt: 'Two-tone test photo',
    width: { type: 'pixels', value: 120 },
  }),
  row({
    type: ContentEditorElementType.IMAGE,
    url: '/fixtures/photo.png',
    width: { type: 'pixels', value: 120 },
  }),
];

/** Attributes for richContent: first_name and user_id are known; plan and team_id are not. */
export const richContentAttributes = { first_name: 'Ada', user_id: 42 };
