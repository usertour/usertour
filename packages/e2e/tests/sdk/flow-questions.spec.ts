import type { FrameLocator } from '@playwright/test';
import {
  type QuestionKind,
  flowSession,
  gotoStep,
  paragraph,
  question,
  richText,
  row,
  userAttribute,
} from './content';
import { type SdkPage, expect, test } from './fixtures';
import { defaultAnswer } from './protocol-server';

/**
 * Question blocks in a flow step, as the server sees them: one AnswerQuestion
 * per answer with the value in the field its type uses; the question's own
 * actions only after the answer is acknowledged; and an answer bound to a user
 * attribute showing up in a later step.
 */

const start = async (sdk: SdkPage) => {
  await sdk.init();
  await sdk.identify('u1');
};

/** A flow of one modal step holding `block`, and a second step after it. */
const questionFlow = (block: unknown, attributes?: unknown[], secondStep: unknown[] = []) =>
  flowSession({
    sessionId: 'session-1',
    contentId: 'flow-1',
    attributes,
    steps: [
      { id: 'flow-1-step-1', cvid: 'flow-1-cvid-1', type: 'modal', data: [row(block)] },
      {
        id: 'flow-1-step-2',
        cvid: 'flow-1-cvid-2',
        type: 'modal',
        data: secondStep.length > 0 ? secondStep : [row(paragraph('Thanks'))],
      },
    ],
  });

const CASES: Array<{
  kind: QuestionKind;
  answer: (step: FrameLocator) => Promise<void>;
  /** Answered on submit rather than on the first click. */
  submits?: boolean;
  expected: Record<string, unknown>;
}> = [
  {
    kind: 'nps',
    answer: (step) => step.getByRole('button', { name: '7', exact: true }).click(),
    expected: {
      questionType: 'nps',
      questionName: 'How likely are you to recommend us?',
      numberAnswer: 7,
    },
  },
  {
    kind: 'star',
    answer: (step) => step.locator('svg[aria-label="4 stars"]').click(),
    expected: { questionType: 'star-rating', questionName: 'Rate this feature', numberAnswer: 4 },
  },
  {
    kind: 'scale',
    answer: (step) => step.getByRole('button', { name: 'Scale option 3', exact: true }).click(),
    expected: { questionType: 'scale', questionName: 'How easy was setup?', numberAnswer: 3 },
  },
  {
    kind: 'single',
    answer: (step) => step.getByText('Weekly', { exact: true }).click(),
    expected: {
      questionType: 'multiple-choice',
      questionName: 'How often do you report?',
      textAnswer: 'weekly',
    },
  },
  {
    kind: 'multi',
    submits: true,
    answer: async (step) => {
      await step.getByText('Monthly', { exact: true }).click();
      await step.getByText('Daily', { exact: true }).click();
    },
    expected: {
      questionType: 'multiple-choice',
      questionName: 'Which reports do you use?',
      listAnswer: ['monthly', 'daily'],
    },
  },
  {
    kind: 'text',
    submits: true,
    answer: (step) =>
      step.getByRole('textbox', { name: 'Text input field' }).fill('Product designer'),
    expected: {
      questionType: 'single-line-text',
      questionName: 'Your role',
      textAnswer: 'Product designer',
    },
  },
  {
    kind: 'textarea',
    submits: true,
    answer: (step) =>
      step.getByRole('textbox', { name: 'Text input field' }).fill('Loving it\nso far'),
    expected: {
      questionType: 'multi-line-text',
      questionName: 'Anything else?',
      textAnswer: 'Loving it\nso far',
    },
  },
];

for (const { kind, answer, submits, expected } of CASES) {
  test(`a ${kind} answer is reported with its value`, async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', questionFlow(question(kind)));
    await answer(sdk.frame());
    if (submits) {
      await sdk.advance(200);
      expect(protocol.messages('AnswerQuestion'), 'nothing before submit').toHaveLength(0);
      await sdk.frame().getByRole('button', { name: 'Submit' }).click();
    }
    await protocol.waitForMessages('AnswerQuestion', 1);
    expect(protocol.messages('AnswerQuestion')).toHaveLength(1);
    expect(protocol.messages('AnswerQuestion')[0].message.payload).toEqual({
      sessionId: 'session-1',
      questionCvid: `q-${kind}`,
      ...expected,
    });
  });
}

test('a question’s actions run only once its answer is acknowledged', async ({ sdk, protocol }) => {
  protocol.answer = (message, connection) =>
    message.kind === 'AnswerQuestion' ? 'silent' : defaultAnswer(message, connection);
  await start(sdk);
  await protocol.push(
    'SetFlowSession',
    questionFlow(question('nps', { actions: [gotoStep('flow-1-cvid-2')] })),
  );
  await sdk.frame().getByRole('button', { name: '7', exact: true }).click();
  await protocol.waitForMessages('AnswerQuestion', 1);
  await sdk.advance(1_000);
  await sdk.page.waitForTimeout(200);
  expect(protocol.messages('GoToStep')).toHaveLength(0);
});

test('a question’s actions run after its answer, and its next step can show the answer it bound', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'SetFlowSession',
    questionFlow(
      question('nps', {
        actions: [gotoStep('flow-1-cvid-2')],
        bindToAttribute: true,
        selectedAttribute: 'nps_score',
      }),
      [{ id: 'attr-nps', codeName: 'nps_score', bizType: 1, dataType: 1, value: null }],
      [row(richText({ text: 'Your score: ' }, userAttribute('nps_score', 'none')))],
    ),
  );
  await sdk.frame().getByRole('button', { name: '7', exact: true }).click();
  await expect(sdk.frame().getByText('Your score: 7')).toBeVisible();
  const kinds = protocol.seen.map((seen) => seen.message.kind);
  expect(kinds.indexOf('AnswerQuestion')).toBeLessThan(kinds.indexOf('GoToStep'));
});

test('a required text question keeps Submit off until something is typed', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push('SetFlowSession', questionFlow(question('text', { required: true })));
  const submit = sdk.frame().getByRole('button', { name: 'Submit' });
  await expect(submit).toBeDisabled();
  await sdk.frame().getByRole('textbox', { name: 'Text input field' }).fill('Designer');
  await expect(submit).toBeEnabled();
});

test('a multiple-choice question keeps Submit off outside its range of picks', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'SetFlowSession',
    questionFlow(question('multi', { lowRange: 2, highRange: 2 })),
  );
  const submit = sdk.frame().getByRole('button', { name: 'Submit' });
  await sdk.frame().getByText('Daily', { exact: true }).click();
  await expect(submit).toBeDisabled();
  await sdk.frame().getByText('Weekly', { exact: true }).click();
  await expect(submit).toBeEnabled();
  await sdk.frame().getByText('Monthly', { exact: true }).click();
  await expect(submit).toBeDisabled();
});

test('the Other option adds what the user typed to the answer', async ({ sdk, protocol }) => {
  await start(sdk);
  await protocol.push('SetFlowSession', questionFlow(question('multi', { enableOther: true })));
  await sdk.frame().getByText('Daily', { exact: true }).click();
  // The Other row shows its placeholder as text until it is clicked into.
  await sdk.frame().getByText('Other...', { exact: true }).click();
  await sdk.frame().getByPlaceholder('Other...').fill('Quarterly');
  await sdk.frame().getByRole('button', { name: 'Submit' }).click();
  await protocol.waitForMessages('AnswerQuestion', 1);
  expect(protocol.messages('AnswerQuestion')[0].message.payload).toMatchObject({
    questionCvid: 'q-multi',
    listAnswer: ['daily', 'Quarterly'],
  });
});
