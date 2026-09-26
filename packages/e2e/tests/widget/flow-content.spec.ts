import type { FrameLocator } from '@playwright/test';
import { type Gallery, expect, test } from './gallery';

const FRAME = 'iframe.usertour-widget-surface-viewport';

type ClickedElement = { type: string; data: { cvid?: string; text?: string } };

/** The widget's onClick(element, value) calls, in order. */
const clicks = async (gallery: Gallery) =>
  (await gallery.calls())
    .filter((call) => call.method === 'tour.handleOnClick')
    .map(({ args: [element, value] }) => ({ element: element as ClickedElement, value }));

const openStep = async (gallery: Gallery, url: string): Promise<FrameLocator> => {
  await gallery.page.goto(url);
  await gallery.settledBox(gallery.page.locator(FRAME));
  return gallery.page.frameLocator(FRAME);
};

test('clicking a button hands the SDK that button', async ({ gallery }) => {
  const step = await openStep(gallery, '/?case=flow-modal');
  await step.getByRole('button', { name: 'Next' }).click();

  const [click] = await clicks(gallery);
  expect(click.element.type).toBe('button');
  expect(click.element.data.text).toBe('Next');
});

test('the close button dismisses the step', async ({ gallery }) => {
  const step = await openStep(gallery, '/?case=flow-modal');
  await step.getByRole('button', { name: 'Close' }).click();

  // No reason argument: UsertourTour.handleDismiss then defaults to close_button_dismiss.
  expect(await gallery.calls()).toContainEqual({ method: 'tour.handleDismiss', args: [null] });
});

test.describe('questions answered with one click report at once', () => {
  const cases: {
    kind: string;
    type: string;
    answer: (step: FrameLocator) => Promise<void>;
    value: unknown;
  }[] = [
    {
      kind: 'nps',
      type: 'nps',
      answer: (step) => step.getByRole('button', { name: '7', exact: true }).click(),
      value: 7,
    },
    {
      kind: 'star',
      type: 'star-rating',
      answer: (step) => step.locator('svg[aria-label="4 stars"]').click(),
      value: 4,
    },
    {
      kind: 'scale',
      type: 'scale',
      answer: (step) => step.getByRole('button', { name: 'Scale option 3', exact: true }).click(),
      value: 3,
    },
    {
      kind: 'single',
      type: 'multiple-choice',
      answer: (step) => step.getByText('Weekly', { exact: true }).click(),
      value: 'weekly',
    },
  ];

  for (const { kind, type, answer, value } of cases) {
    test(kind, async ({ gallery }) => {
      const step = await openStep(gallery, `/?case=flow-question&kind=${kind}`);
      await answer(step);

      const [click] = await clicks(gallery);
      expect(click.element.type).toBe(type);
      expect(click.value).toEqual(value);
    });
  }
});

test.describe('questions with a submit button report only on submit', () => {
  const cases: {
    kind: string;
    type: string;
    answer: (step: FrameLocator) => Promise<void>;
    value: unknown;
  }[] = [
    {
      kind: 'multi',
      type: 'multiple-choice',
      answer: async (step) => {
        await step.getByText('Monthly', { exact: true }).click();
        await step.getByText('Daily', { exact: true }).click();
      },
      // In click order, not option order.
      value: ['monthly', 'daily'],
    },
    {
      kind: 'text',
      type: 'single-line-text',
      answer: (step) =>
        step.getByRole('textbox', { name: 'Text input field' }).fill('Product designer'),
      value: 'Product designer',
    },
    {
      kind: 'textarea',
      type: 'multi-line-text',
      answer: (step) =>
        step.getByRole('textbox', { name: 'Text input field' }).fill('Loving it\nso far'),
      value: 'Loving it\nso far',
    },
  ];

  for (const { kind, type, answer, value } of cases) {
    test(kind, async ({ gallery }) => {
      const step = await openStep(gallery, `/?case=flow-question&kind=${kind}`);
      await answer(step);
      expect(await clicks(gallery), 'nothing reported before submit').toEqual([]);

      await step.getByRole('button', { name: 'Submit' }).click();

      const [click] = await clicks(gallery);
      expect(click.element.type).toBe(type);
      expect(click.value).toEqual(value);
    });
  }
});

// Guards 526262820: choice inputs used fixed ids, so with two choice questions
// in one step the second question's labels pointed at the first one's inputs.
test('choosing in the second of two identical choice questions answers the second', async ({
  gallery,
}) => {
  const step = await openStep(gallery, '/?case=flow-two-choices');
  const ids = await gallery.page
    .locator(FRAME)
    .evaluate((frame: HTMLIFrameElement) =>
      [...(frame.contentDocument?.querySelectorAll('[id]') ?? [])].map((el) => el.id),
    );
  expect(new Set(ids).size, 'ids in the step are unique').toBe(ids.length);

  await step.getByText('Weekly', { exact: true }).nth(1).click();

  const [click] = await clicks(gallery);
  expect(click.element.data.cvid).toBe('q-second');
  expect(click.value).toBe('weekly');
});

test('buttons follow their disable and hide rules', async ({ gallery }) => {
  const step = await openStep(gallery, '/?case=flow-conditional-buttons');

  await expect(step.getByRole('button', { name: 'Plain' })).toBeEnabled();
  await expect(
    step.getByRole('button', { name: 'Disabled' }),
    'rule on, condition met',
  ).toBeDisabled();
  await expect(step.getByRole('button', { name: 'Hidden' }), 'rule on, condition met').toHaveCount(
    0,
  );
  await expect(
    step.getByRole('button', { name: 'Kept' }),
    'rule on, condition not met',
  ).toBeEnabled();
});

test.describe('rich content', () => {
  test('user attributes fill in, and fall back when the user has none', async ({ gallery }) => {
    const step = await openStep(gallery, '/?case=flow-rich-content');
    await expect(step.getByText('Hi Ada, you are on the free plan.')).toBeVisible();
  });

  test('link URLs fill in user attributes, with the fallback when missing', async ({ gallery }) => {
    const step = await openStep(gallery, '/?case=flow-rich-content');

    const profile = step.getByRole('link', { name: 'Your profile' });
    await expect(profile).toHaveAttribute('href', 'https://example.com/users/42');
    await expect(profile).toHaveAttribute('target', '_blank');
    await expect(step.getByRole('link', { name: 'Your team' })).toHaveAttribute(
      'href',
      'https://example.com/teams/none',
    );
  });

  // Guards 4bef2ddf6: the authored alt text used to be dropped for a generic one.
  test('images keep their alt text, and get a generic one when none is set', async ({
    gallery,
  }) => {
    const step = await openStep(gallery, '/?case=flow-rich-content');
    const images = step.locator('img');

    await expect(images).toHaveCount(2);
    await expect(images.nth(0)).toHaveAttribute('alt', 'Two-tone test photo');
    await expect(images.nth(1)).toHaveAttribute('alt', 'Image');
    expect(
      await images.nth(0).evaluate((img: HTMLImageElement) => img.naturalWidth),
      'the image actually loaded',
    ).toBe(120);
  });
});
