import {
  button,
  dismissEmbed,
  elementPresent,
  embedSession,
  evaluateJs,
  gotoStep,
  inputEmpty,
  oneStepEmbed,
  paragraph,
  question,
  row,
  twoStepFlow,
} from './content';
import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { defaultAnswer } from './protocol-server';

/**
 * Embeds, from the pushed session to what the page reports: a card at its
 * target, several at once, paging between steps, button and dismissal
 * reports, the cover placement, and the sessionless pre-activation.
 */

const FRAME = 'iframe.usertour-widget-embed-frame';
const SHELL = '.usertour-widget-embed';

type RemovalCounter = Window & { __shellRemovals: number };

/** Counts, from now on, every shell mount taken out of the page. */
const countShellRemovals = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as RemovalCounter).__shellRemovals = 0;
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (node instanceof HTMLElement && node.hasAttribute('data-usertour-inline-mount')) {
            (window as unknown as RemovalCounter).__shellRemovals += 1;
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  });

const shellRemovals = (page: Page) =>
  page.evaluate(() => (window as unknown as RemovalCounter).__shellRemovals);

/** Adds `#late` to the page: a target that was not there when the embed arrived. */
const appendLateTarget = (page: Page) =>
  page.evaluate(() => {
    const late = document.createElement('div');
    late.id = 'late';
    document.querySelector('main')?.append(late);
  });

const RUN = "window.__usertourRecorded.ran = ['yes']";

const start = async (sdk: {
  init: () => Promise<unknown>;
  identify: (id: string) => Promise<unknown>;
}) => {
  await sdk.init();
  await sdk.identify('u1');
};

test('the handshake declares the embed capability', async ({ sdk, protocol }) => {
  await start(sdk);
  expect(protocol.attempts[0].auth.capabilities).toEqual(['embed']);
});

test('an embed renders after its target and its dismissal ends the session', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Upgrade to unlock reports'),
  );
  const frame = sdk.page.frameLocator(FRAME);
  await expect(frame.getByText('Upgrade to unlock reports')).toBeVisible();
  expect(await sdk.isStarted('embed-1')).toBe(true);

  // Inserted into the flow right after the target, not floating over it.
  const previous = await sdk.page
    .locator(SHELL)
    .evaluate((shell) => shell.previousElementSibling?.id);
  expect(previous).toBe('panel');

  await frame.getByRole('button', { name: 'Close' }).click();
  await protocol.waitForMessages('EndContent', 1);
  expect(protocol.messages('EndContent')[0].message.payload).toEqual({
    sessionId: 'embed-session-1',
    endReason: 'dismiss_button',
  });
  await expect(sdk.page.locator(FRAME)).toHaveCount(0);
  await expect(sdk.page.locator(SHELL)).toHaveCount(0);
});

test('several embeds show at once, each at its own target', async ({ sdk, protocol }) => {
  await start(sdk);
  await protocol.push('AddEmbed', oneStepEmbed('embed-session-1', 'embed-1', '#cta', 'First'));
  await protocol.push('AddEmbed', oneStepEmbed('embed-session-2', 'embed-2', '#panel', 'Second'));
  await expect(sdk.page.locator(FRAME)).toHaveCount(2);
  expect(await sdk.isStarted('embed-1')).toBe(true);
  expect(await sdk.isStarted('embed-2')).toBe(true);

  await protocol.push('RemoveEmbed', { contentId: 'embed-1' });
  await expect(sdk.page.locator(FRAME)).toHaveCount(1);
  expect(await sdk.isStarted('embed-1')).toBe(false);
  expect(await sdk.isStarted('embed-2')).toBe(true);
});

test('a button press is reported with its step and cvid before its actions run', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Upgrade now', [
      button('Not now', [dismissEmbed()], { cvid: 'button-not-now' }),
    ]),
  );
  const frame = sdk.page.frameLocator(FRAME);
  await frame.getByRole('button', { name: 'Not now' }).click();

  await protocol.waitForMessages('ClickButton', 1);
  expect(protocol.messages('ClickButton')[0].message.payload).toEqual({
    sessionId: 'embed-session-1',
    stepId: 'embed-1-step-1',
    buttonCvid: 'button-not-now',
    buttonText: 'Not now',
  });
  await protocol.waitForMessages('EndContent', 1);
  expect(protocol.messages('EndContent')[0].message.payload).toEqual({
    sessionId: 'embed-session-1',
    endReason: 'action_dismiss',
  });
  const order = protocol.messages().map((seen) => seen.message.kind);
  expect(order.indexOf('ClickButton')).toBeLessThan(order.indexOf('EndContent'));
});

test('without user dismissal allowed, an embed has no close button', async ({ sdk, protocol }) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    embedSession({
      sessionId: 'embed-session-1',
      contentId: 'embed-1',
      target: '#panel',
      allowDismiss: false,
      steps: [
        {
          id: 'embed-1-step-1',
          cvid: 'embed-1-cvid-1',
          type: 'inline',
          data: [row(paragraph('Upgrade to unlock reports'))],
        },
      ],
    }),
  );
  const frame = sdk.page.frameLocator(FRAME);
  await expect(frame.getByText('Upgrade to unlock reports')).toBeVisible();
  await expect(frame.getByRole('button', { name: 'Close' })).toHaveCount(0);
});

test('an outer margin above and below goes around the card, not out of it', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    embedSession({
      sessionId: 'embed-session-1',
      contentId: 'embed-1',
      target: '#panel',
      outerMargin: { top: 16, right: 0, bottom: 16, left: 0 },
      steps: [
        {
          id: 'embed-1-step-1',
          cvid: 'embed-1-cvid-1',
          type: 'inline',
          data: [row(paragraph('Upgrade now')), row(button('Learn more'))],
        },
      ],
    }),
  );
  await expect(sdk.page.frameLocator(FRAME).getByText('Upgrade now')).toBeVisible();
  await expect
    .poll(() =>
      sdk.page.locator(FRAME).evaluate((frame) => {
        const content = (frame as HTMLIFrameElement).contentDocument?.documentElement;
        return {
          // The frame is as tall as its content: nothing is cut off.
          clipped: (content?.scrollHeight ?? 0) - frame.getBoundingClientRect().height,
          // And the shell is taller than the frame by the two margins.
          around:
            (frame.closest('.usertour-widget-embed') as HTMLElement).getBoundingClientRect()
              .height - frame.getBoundingClientRect().height,
        };
      }),
    )
    .toEqual({ clipped: 0, around: 32 });
});

test('an embed’s buttons run their actions and follow their rules as the page changes', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#cta', 'Finish setting up', [
      button('Read more', [evaluateJs(RUN)]),
      button('Continue', [], { disableWhen: [inputEmpty('#email')] }),
      button('Skip for now', [], { hideWhen: [elementPresent('#secondary')] }),
    ]),
  );
  const frame = sdk.page.frameLocator(FRAME);
  const next = frame.getByRole('button', { name: 'Continue' });
  const skip = frame.getByRole('button', { name: 'Skip for now' });
  await expect(next).toBeDisabled();
  await expect(skip).toHaveCount(0);

  await frame.getByRole('button', { name: 'Read more' }).click();
  await expect.poll(() => sdk.recorded('ran')).toEqual(['yes']);

  await sdk.page.fill('#email', 'ada@example.com');
  await sdk.advance(400);
  await expect(next).toBeEnabled();
  await sdk.page.evaluate(() => document.getElementById('secondary')?.remove());
  await sdk.advance(400);
  await expect(skip).toBeVisible();
});

test('a question answered in an embed is reported against its session, then its actions run', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    embedSession({
      sessionId: 'embed-session-1',
      contentId: 'embed-1',
      target: '#panel',
      steps: [
        {
          id: 'embed-1-step-1',
          cvid: 'embed-1-cvid-1',
          type: 'inline',
          data: [row(question('nps', { actions: [gotoStep('embed-1-cvid-2')] }))],
        },
        {
          id: 'embed-1-step-2',
          cvid: 'embed-1-cvid-2',
          type: 'inline',
          data: [row(paragraph('Thanks for the feedback'))],
        },
      ],
    }),
  );
  const frame = sdk.page.frameLocator(FRAME);
  await frame.getByRole('button', { name: '7', exact: true }).click();

  await protocol.waitForMessages('AnswerQuestion', 1);
  expect(protocol.messages('AnswerQuestion')[0].message.payload).toEqual({
    sessionId: 'embed-session-1',
    questionCvid: 'q-nps',
    questionType: 'nps',
    questionName: 'How likely are you to recommend us?',
    numberAnswer: 7,
  });
  await expect(frame.getByText('Thanks for the feedback')).toBeVisible();
  await protocol.waitForMessages('GoToStep', 1);
  expect(protocol.messages('GoToStep')[0].message.payload).toMatchObject({
    sessionId: 'embed-session-1',
    stepId: 'embed-1-step-2',
  });
  const order = protocol.messages().map((seen) => seen.message.kind);
  expect(order.indexOf('AnswerQuestion')).toBeLessThan(order.indexOf('GoToStep'));
});

test.describe('steps', () => {
  const twoSteps = (sessionId: string | undefined, contentId: string, currentCvid?: string) =>
    embedSession({
      sessionId,
      contentId,
      target: '#panel',
      currentCvid,
      steps: [
        {
          id: `${contentId}-step-1`,
          cvid: `${contentId}-cvid-1`,
          type: 'inline',
          name: 'Step 1',
          data: [
            row(paragraph('Step one')),
            row(button('Next', [gotoStep(`${contentId}-cvid-2`)], { cvid: 'button-next' })),
          ],
        },
        {
          id: `${contentId}-step-2`,
          cvid: `${contentId}-cvid-2`,
          type: 'inline',
          name: 'Step 2',
          data: [
            row(paragraph('Step two')),
            row(button('Back', [gotoStep(`${contentId}-cvid-1`)])),
          ],
        },
      ],
    });

  test('a step-goto button pages within the same shell and reports the step', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('AddEmbed', twoSteps('embed-session-1', 'embed-1'));
    const frame = sdk.page.frameLocator(FRAME);
    await expect(frame.getByText('Step one')).toBeVisible();
    const shellBefore = await sdk.page.locator(SHELL).evaluate((shell) => {
      (shell as HTMLElement).dataset.marker = 'same-shell';
      return true;
    });
    expect(shellBefore).toBe(true);

    await frame.getByRole('button', { name: 'Next' }).click();
    await protocol.waitForMessages('GoToStep', 1);
    expect(protocol.messages('GoToStep')[0].message.payload).toEqual({
      sessionId: 'embed-session-1',
      stepId: 'embed-1-step-2',
    });
    await expect(frame.getByText('Step two')).toBeVisible();
    // The shell stayed in place: no remount, no layout shift between steps.
    await expect(sdk.page.locator(SHELL)).toHaveAttribute('data-marker', 'same-shell');

    await frame.getByRole('button', { name: 'Back' }).click();
    await protocol.waitForMessages('GoToStep', 2);
    expect(protocol.messages('GoToStep')[1].message.payload).toEqual({
      sessionId: 'embed-session-1',
      stepId: 'embed-1-step-1',
    });
    await expect(frame.getByText('Step one')).toBeVisible();
  });

  test('a step change rebuilds the step content instead of patching it', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('AddEmbed', twoSteps('embed-session-1', 'embed-1'));
    const frame = sdk.page.frameLocator(FRAME);
    const nextButton = frame.getByRole('button', { name: 'Next' });
    await expect(nextButton).toBeVisible();
    // Both steps put a button in the same slot. Were its node kept and
    // patched, Back would morph out of Next's colours and inherit its state.
    await nextButton.evaluate((element) => {
      (element as HTMLElement).dataset.marker = 'step-one-button';
    });

    await nextButton.click();
    await expect(frame.getByText('Step two')).toBeVisible();
    const backButton = frame.getByRole('button', { name: 'Back' });
    await expect(backButton).toBeVisible();
    await expect(backButton).not.toHaveAttribute('data-marker', 'step-one-button');
  });

  test('a session opens on its remembered step without reporting it again', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('AddEmbed', twoSteps('embed-session-1', 'embed-1', 'embed-1-cvid-2'));
    await expect(sdk.page.frameLocator(FRAME).getByText('Step two')).toBeVisible();
    expect(protocol.messages('GoToStep')).toHaveLength(0);
  });

  test('the server can force a step', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('AddEmbed', twoSteps('embed-session-1', 'embed-1'));
    const frame = sdk.page.frameLocator(FRAME);
    await expect(frame.getByText('Step one')).toBeVisible();
    await protocol.push('ForceGoToStep', {
      sessionId: 'embed-session-1',
      stepId: 'embed-1-step-2',
    });
    await expect(frame.getByText('Step two')).toBeVisible();
    expect(protocol.messages('GoToStep')).toHaveLength(0);
  });
});

/** The element's padding box in viewport coordinates: the box a cover takes. */
const paddingBox = (sdk: { page: Page }, selector: string) =>
  sdk.page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x + element.clientLeft,
      y: rect.y + element.clientTop,
      width: element.clientWidth,
      height: element.clientHeight,
    };
  });

const expectSameBox = (
  actual: { x: number; y: number; width: number; height: number } | null,
  expected: { x: number; y: number; width: number; height: number } | null,
) => {
  expect(actual && expected).toBeTruthy();
  expect(Math.abs(actual!.x - expected!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual!.y - expected!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual!.width - expected!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual!.height - expected!.height)).toBeLessThanOrEqual(1);
};

test('the cover placement sits over the target and tracks its box', async ({ sdk, protocol }) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Locked', [], 'cover-element'),
  );
  const shell = sdk.page.locator(SHELL);
  await expect(sdk.page.frameLocator(FRAME).getByText('Locked')).toBeVisible();

  // The cover takes the target's padding box: the target's own border and
  // radius stay visible around the card.
  expectSameBox(await shell.boundingBox(), await paddingBox(sdk, '#panel'));

  // The cover stands in for the target, so the painted card fills the whole
  // box — not just the content's height, with the target showing underneath.
  const paintedHeight = async () => {
    const painted = await sdk.page.frameLocator(FRAME).locator('body > div').first().boundingBox();
    return painted?.height ?? 0;
  };
  expect(
    Math.abs((await paintedHeight()) - (await shell.boundingBox())!.height),
  ).toBeLessThanOrEqual(1);
  // The cover is a positioned child of the target, in the target's own
  // scrolling context; the target's content is untouched.
  expect(
    await shell.evaluate((el) => [el.parentElement?.id, getComputedStyle(el).position]),
  ).toEqual(['panel', 'absolute']);

  // The host lays the page out differently; the cover follows.
  await sdk.page.evaluate(() => {
    const panel = document.getElementById('panel') as HTMLElement;
    panel.style.marginTop = '120px';
    panel.style.height = '160px';
  });
  await expect
    .poll(async () => {
      const target = await paddingBox(sdk, '#panel');
      const cover = await shell.boundingBox();
      return Math.abs(cover!.y - target.y) <= 1 && Math.abs(cover!.height - target.height) <= 1;
    })
    .toBe(true);
  await expect
    .poll(async () => Math.abs((await paintedHeight()) - (await shell.boundingBox())!.height) <= 1)
    .toBe(true);

  // A static target is made the cover's containing block, for the cover's
  // lifetime only.
  const targetPosition = () =>
    sdk.page.locator('#panel').evaluate((el) => (el as HTMLElement).style.position);
  expect(await targetPosition()).toBe('relative');
  await protocol.push('RemoveEmbed', { contentId: 'embed-1' });
  await expect(sdk.page.locator(FRAME)).toHaveCount(0);
  expect(await targetPosition()).toBe('');
});

test('a scroll moves the cover with its target without repositioning it', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await sdk.page.evaluate(() => {
    document.body.style.minHeight = '3000px';
  });
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Locked', [], 'cover-element'),
  );
  const shell = sdk.page.locator(SHELL);
  await expect(sdk.page.frameLocator(FRAME).getByText('Locked')).toBeVisible();
  const styleBefore = await shell.getAttribute('style');
  const targetBefore = await paddingBox(sdk, '#panel');

  await sdk.page.evaluate(() => window.scrollTo(0, 400));
  await expect
    .poll(async () => (await paddingBox(sdk, '#panel')).y)
    .toBeLessThan(targetBefore.y - 300);

  // The page scrolled the cover along with its target. A fixed overlay would
  // have been re-placed from the scroll event, one frame behind the target.
  expectSameBox(await shell.boundingBox(), await paddingBox(sdk, '#panel'));
  expect(await shell.getAttribute('style')).toBe(styleBefore);
});

test('a cover inside a scrolling container moves with its target without repositioning it', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  // The target sits in an unpositioned scroll container, as an app shell's
  // main area usually is.
  await sdk.page.evaluate(() => {
    const panel = document.getElementById('panel') as HTMLElement;
    const scroller = document.createElement('div');
    scroller.id = 'scroller';
    scroller.style.height = '160px';
    scroller.style.overflow = 'auto';
    const above = document.createElement('div');
    above.style.height = '40px';
    const below = document.createElement('div');
    below.style.height = '600px';
    panel.replaceWith(scroller);
    scroller.append(above, panel, below);
  });
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Locked', [], 'cover-element'),
  );
  const shell = sdk.page.locator(SHELL);
  await expect(sdk.page.frameLocator(FRAME).getByText('Locked')).toBeVisible();
  expectSameBox(await shell.boundingBox(), await paddingBox(sdk, '#panel'));
  const styleBefore = await shell.getAttribute('style');
  const targetBefore = await paddingBox(sdk, '#panel');

  await sdk.page.evaluate(() => {
    (document.getElementById('scroller') as HTMLElement).scrollTop = 60;
  });
  await expect
    .poll(async () => (await paddingBox(sdk, '#panel')).y)
    .toBeLessThan(targetBefore.y - 50);
  // The container scrolled the cover along with its target: the cover's
  // containing block is the target, not something outside the container.
  expectSameBox(await shell.boundingBox(), await paddingBox(sdk, '#panel'));
  expect(await shell.getAttribute('style')).toBe(styleBefore);
});

test('a cover on a target that scrolls its own content mounts in the body and stays over the box', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await sdk.page.evaluate(() => {
    const panel = document.getElementById('panel') as HTMLElement;
    panel.style.height = '80px';
    panel.style.overflow = 'auto';
    const tall = document.createElement('div');
    tall.style.height = '400px';
    panel.append(tall);
  });
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Locked', [], 'cover-element'),
  );
  const shell = sdk.page.locator(SHELL);
  await expect(sdk.page.frameLocator(FRAME).getByText('Locked')).toBeVisible();
  // A child would scroll away with the target's content, so the cover is not one.
  expect(
    await shell.evaluate((el) => [el.parentElement?.tagName, getComputedStyle(el).position]),
  ).toEqual(['BODY', 'absolute']);
  const panel = sdk.page.locator('#panel');
  expectSameBox(await shell.boundingBox(), await panel.boundingBox());

  await sdk.page.evaluate(() => {
    (document.getElementById('panel') as HTMLElement).scrollTop = 100;
  });
  await expect.poll(() => panel.evaluate((el) => el.scrollTop)).toBe(100);
  expectSameBox(await shell.boundingBox(), await panel.boundingBox());
});

test('two covers on one target keep it positioned until the last one leaves', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'First', [], 'cover-element'),
  );
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-2', 'embed-2', '#panel', 'Second', [], 'cover-element'),
  );
  await expect(sdk.page.frameLocator(FRAME).last().getByText('Second')).toBeVisible();
  await expect(sdk.page.locator(SHELL)).toHaveCount(2);
  const targetPosition = () =>
    sdk.page.locator('#panel').evaluate((el) => (el as HTMLElement).style.position);
  expect(await targetPosition()).toBe('relative');

  // The first cover leaves; the second still has the target as its containing
  // block, so it still fills the target rather than whatever is above it.
  await protocol.push('RemoveEmbed', { contentId: 'embed-1' });
  await expect(sdk.page.locator(SHELL)).toHaveCount(1);
  expect(await targetPosition()).toBe('relative');
  expectSameBox(await sdk.page.locator(SHELL).boundingBox(), await paddingBox(sdk, '#panel'));

  await protocol.push('RemoveEmbed', { contentId: 'embed-2' });
  await expect(sdk.page.locator(SHELL)).toHaveCount(0);
  expect(await targetPosition()).toBe('');
});

test('a cover on an element that takes no child mounts in the body at document coordinates', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await sdk.page.evaluate(() => {
    document.body.style.minHeight = '3000px';
    const chart = document.createElement('canvas');
    chart.id = 'chart';
    chart.width = 300;
    chart.height = 120;
    chart.style.display = 'block';
    document.getElementById('panel')?.after(chart);
  });
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#chart', 'Locked', [], 'cover-element'),
  );
  const shell = sdk.page.locator(SHELL);
  await expect(sdk.page.frameLocator(FRAME).getByText('Locked')).toBeVisible();
  expect(
    await shell.evaluate((el) => [el.parentElement?.tagName, getComputedStyle(el).position]),
  ).toEqual(['BODY', 'absolute']);
  const chart = sdk.page.locator('#chart');
  expectSameBox(await shell.boundingBox(), await chart.boundingBox());
  const styleBefore = await shell.getAttribute('style');
  const chartBefore = await chart.boundingBox();

  await sdk.page.evaluate(() => window.scrollTo(0, 400));
  await expect.poll(async () => (await chart.boundingBox())!.y).toBeLessThan(chartBefore!.y - 300);
  expectSameBox(await shell.boundingBox(), await chart.boundingBox());
  expect(await shell.getAttribute('style')).toBe(styleBefore);
});

test('the cover places its content at the top, center or bottom of the box', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  // A tall target, so the content has room to sit somewhere in the box.
  await sdk.page.evaluate(() => {
    (document.getElementById('panel') as HTMLElement).style.height = '400px';
  });
  const measure = async () => {
    const frame = await sdk.page.locator(FRAME).boundingBox();
    const row = await sdk.page
      .frameLocator(FRAME)
      .locator('body > div > div > *')
      .first()
      .boundingBox();
    return { frame: frame!, row: row! };
  };
  const padding = 16;

  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Locked', [], 'cover-element', 'top'),
  );
  await expect(sdk.page.frameLocator(FRAME).getByText('Locked')).toBeVisible();
  let { frame, row } = await measure();
  expect(row.y - frame.y).toBeLessThanOrEqual(padding + 2);
  await protocol.push('RemoveEmbed', { contentId: 'embed-1' });
  await expect(sdk.page.locator(FRAME)).toHaveCount(0);

  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-2', 'embed-2', '#panel', 'Locked', [], 'cover-element', 'bottom'),
  );
  await expect(sdk.page.frameLocator(FRAME).getByText('Locked')).toBeVisible();
  ({ frame, row } = await measure());
  expect(frame.y + frame.height - (row.y + row.height)).toBeLessThanOrEqual(padding + 2);
  await protocol.push('RemoveEmbed', { contentId: 'embed-2' });
  await expect(sdk.page.locator(FRAME)).toHaveCount(0);

  // The default: centered.
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-3', 'embed-3', '#panel', 'Locked', [], 'cover-element'),
  );
  await expect(sdk.page.frameLocator(FRAME).getByText('Locked')).toBeVisible();
  ({ frame, row } = await measure());
  const frameCenter = frame.y + frame.height / 2;
  const rowCenter = row.y + row.height / 2;
  expect(Math.abs(rowCenter - frameCenter)).toBeLessThanOrEqual(2);
});

test('a sessionless embed starts its content once the target is found and renders nothing until then', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push('AddEmbed', oneStepEmbed(undefined, 'embed-1', '#panel', 'Pending'));
  await protocol.waitForMessages('StartContent', 1);
  expect(protocol.messages('StartContent')[0].message.payload).toMatchObject({
    contentId: 'embed-1',
    startReason: 'start_from_condition',
  });
  await expect(sdk.page.locator(FRAME)).toHaveCount(0);

  // The server records the session and hands it back.
  await protocol.push('AddEmbed', oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Pending'));
  await expect(sdk.page.frameLocator(FRAME).getByText('Pending')).toBeVisible();
  expect(await sdk.isStarted('embed-1')).toBe(true);
});

test('a hidden first step routes only once the session exists, and reports where it lands', async ({
  sdk,
  protocol,
}) => {
  // A trigger on a hidden router step: `#panel` is on the page, so it fires
  // as soon as the step's trigger is armed.
  const routed = (sessionId: string | undefined) =>
    embedSession({
      sessionId,
      contentId: 'embed-1',
      target: '#panel',
      steps: [
        {
          id: 'embed-1-step-1',
          cvid: 'embed-1-cvid-1',
          type: 'hidden',
          name: 'Router',
          data: [],
          trigger: [
            {
              id: 'trigger-1',
              conditions: [
                {
                  id: 'trigger-cond-1',
                  type: 'element',
                  operators: 'and',
                  data: {
                    logic: 'present',
                    elementData: { type: 'manual', customSelector: '#panel', sequence: '1st' },
                  },
                },
              ],
              actions: [gotoStep('embed-1-cvid-2')],
              wait: 0,
            },
          ],
        },
        {
          id: 'embed-1-step-2',
          cvid: 'embed-1-cvid-2',
          type: 'inline',
          name: 'Routed',
          data: [row(paragraph('Routed'))],
        },
      ],
    });

  await start(sdk);
  await protocol.push('AddEmbed', routed(undefined));
  await protocol.waitForMessages('StartContent', 1);
  // Nothing is active before the session exists, so nothing routes or reports.
  await sdk.advance(500);
  expect(protocol.messages('GoToStep')).toHaveLength(0);

  // The server hands the session back on its first step; the router now runs
  // with a session to report against, and the server learns the landing step.
  await protocol.push('AddEmbed', routed('embed-session-1'));
  await expect(sdk.page.frameLocator(FRAME).getByText('Routed')).toBeVisible();
  await protocol.waitForMessages('GoToStep', 1);
  expect(protocol.messages('GoToStep')[0].message.payload).toEqual({
    sessionId: 'embed-session-1',
    stepId: 'embed-1-step-2',
  });
});

test('a session resting on a hidden step opens on the step it routes to once the target appears', async ({
  sdk,
  protocol,
}) => {
  // The session was left on the router. Its condition holds now, but the
  // target is not on the page yet, so it routes on before there is a store
  // to show the step in.
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    embedSession({
      sessionId: 'embed-session-1',
      contentId: 'embed-1',
      target: '#late',
      currentCvid: 'embed-1-cvid-1',
      steps: [
        {
          id: 'embed-1-step-1',
          cvid: 'embed-1-cvid-1',
          type: 'hidden',
          name: 'Router',
          data: [],
          trigger: [
            {
              id: 'trigger-1',
              conditions: [
                {
                  id: 'trigger-cond-1',
                  type: 'element',
                  operators: 'and',
                  data: {
                    logic: 'present',
                    elementData: { type: 'manual', customSelector: '#cta', sequence: '1st' },
                  },
                },
              ],
              actions: [gotoStep('embed-1-cvid-2')],
              wait: 0,
            },
          ],
        },
        {
          id: 'embed-1-step-2',
          cvid: 'embed-1-cvid-2',
          type: 'inline',
          name: 'Routed',
          data: [row(paragraph('Routed'))],
        },
      ],
    }),
  );
  await protocol.waitForMessages('GoToStep', 1);
  await sdk.advance(500);
  await expect(sdk.page.locator(SHELL)).toHaveCount(0);

  await appendLateTarget(sdk.page);
  await sdk.advance(2000);
  await expect(sdk.page.frameLocator(FRAME).getByText('Routed')).toBeVisible();
});

test('a step forced before the target appears is the step the embed opens on', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    embedSession({
      sessionId: 'embed-session-1',
      contentId: 'embed-1',
      target: '#late',
      steps: [
        {
          id: 'embed-1-step-1',
          cvid: 'embed-1-cvid-1',
          type: 'inline',
          name: 'Step 1',
          data: [row(paragraph('Step one'))],
        },
        {
          id: 'embed-1-step-2',
          cvid: 'embed-1-cvid-2',
          type: 'inline',
          name: 'Step 2',
          data: [row(paragraph('Step two'))],
        },
      ],
    }),
  );
  await sdk.advance(300);
  await protocol.push('ForceGoToStep', { sessionId: 'embed-session-1', stepId: 'embed-1-step-2' });
  await sdk.advance(300);

  await appendLateTarget(sdk.page);
  await sdk.advance(2000);
  const frame = sdk.page.frameLocator(FRAME);
  await expect(frame.getByText('Step two')).toBeVisible();
  await expect(frame.getByText('Step one')).toHaveCount(0);
});

test('a hidden step between two inline steps routes on without unmounting the frame', async ({
  sdk,
  protocol,
}) => {
  // A button sends the user through a hidden router step whose trigger fires
  // at once (`#panel` is on the page) and lands on a third step. The router
  // has no UI, and it must not show that either: the third step renders into
  // the frame the first one rendered into. For a cover, that is what keeps
  // the target covered throughout. The router's own report is held back, so
  // the 200 ms check loop ticks while the router is current but not applied.
  await start(sdk);
  let releaseRouterReport = () => {};
  const routerReport = new Promise<void>((resolve) => {
    releaseRouterReport = resolve;
  });
  protocol.answer = async (message, connection) => {
    if (message.kind === 'GoToStep' && message.payload?.stepId === 'embed-1-step-2') {
      await routerReport;
    }
    return defaultAnswer(message, connection);
  };
  await protocol.push(
    'AddEmbed',
    embedSession({
      sessionId: 'embed-session-1',
      contentId: 'embed-1',
      target: '#panel',
      placement: 'cover-element',
      steps: [
        {
          id: 'embed-1-step-1',
          cvid: 'embed-1-cvid-1',
          type: 'inline',
          name: 'First',
          data: [row(paragraph('First')), row(button('Next', [gotoStep('embed-1-cvid-2')]))],
        },
        {
          id: 'embed-1-step-2',
          cvid: 'embed-1-cvid-2',
          type: 'hidden',
          name: 'Router',
          data: [],
          trigger: [
            {
              id: 'trigger-1',
              conditions: [
                {
                  id: 'trigger-cond-1',
                  type: 'element',
                  operators: 'and',
                  data: {
                    logic: 'present',
                    elementData: { type: 'manual', customSelector: '#panel', sequence: '1st' },
                  },
                },
              ],
              actions: [gotoStep('embed-1-cvid-3')],
              wait: 0,
            },
          ],
        },
        {
          id: 'embed-1-step-3',
          cvid: 'embed-1-cvid-3',
          type: 'inline',
          name: 'Routed',
          data: [row(paragraph('Routed'))],
        },
      ],
    }),
  );
  const frame = sdk.page.frameLocator(FRAME);
  await expect(frame.getByText('First')).toBeVisible();

  // Mark the frame the first step rendered into, and count the mounts that
  // leave the page from here on.
  await sdk.page.evaluate((selector) => {
    const testWindow = window as unknown as { __mountRemovals: number };
    testWindow.__mountRemovals = 0;
    document.querySelector(selector)?.setAttribute('data-test-first-frame', '');
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (node instanceof HTMLElement && node.hasAttribute('data-usertour-inline-mount')) {
            testWindow.__mountRemovals += 1;
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }, FRAME);

  await frame.getByRole('button', { name: 'Next' }).click();
  // The router is current and unreported; the first step stays on screen
  // through the check loop's ticks.
  await sdk.advance(1000);
  await expect(frame.getByText('First')).toBeVisible();
  releaseRouterReport();
  await expect(frame.getByText('Routed')).toBeVisible();
  await protocol.waitForMessages('GoToStep', 2);
  expect(protocol.messages('GoToStep').map((entry) => entry.message.payload?.stepId)).toEqual([
    'embed-1-step-2',
    'embed-1-step-3',
  ]);
  const removals = await sdk.page.evaluate(
    () => (window as unknown as { __mountRemovals: number }).__mountRemovals,
  );
  expect(removals).toBe(0);
  await expect(sdk.page.locator(`${FRAME}[data-test-first-frame]`)).toHaveCount(1);
});

test('several embeds on one target keep their frames and their delivery order', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'First', [], 'top-of-container-element'),
  );
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-2', 'embed-2', '#panel', 'Second', [], 'top-of-container-element'),
  );
  await expect(sdk.page.locator(FRAME)).toHaveCount(2);
  // Each frame measures its content once rendered, and the measurement re-runs
  // the mount effect: that used to move the other shell, reloading its frame
  // while React kept rendering into the old document — two blank cards.
  await sdk.advance(600);
  await expect(sdk.page.frameLocator(FRAME).first().getByText('First')).toBeVisible();
  await expect(sdk.page.frameLocator(FRAME).nth(1).getByText('Second')).toBeVisible();
  // Both sit at the top of the target, in delivery order.
  const order = await sdk.page.evaluate(() => {
    const children = [...(document.getElementById('panel') as HTMLElement).children];
    return children.slice(0, 2).map((child) => child.className);
  });
  expect(order).toEqual(['usertour-widget-embed', 'usertour-widget-embed']);
  const texts = await sdk.page.evaluate(() => {
    return [...document.querySelectorAll('#panel > .usertour-widget-embed iframe')].map((frame) =>
      (frame as HTMLIFrameElement).contentDocument?.body?.innerText.trim(),
    );
  });
  expect(texts).toEqual(['First', 'Second']);
});

test('an embed stays mounted while its target is scrolled out of the viewport', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push('AddEmbed', oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Here'));
  await expect(sdk.page.locator(FRAME)).toHaveCount(1);

  // Push the target well below the fold and count shell insertions from here:
  // the viewport check used to hide the embed, which reflowed the target back
  // into view, which showed it again, every tick.
  await sdk.page.evaluate(() => {
    (document.getElementById('panel') as HTMLElement).style.marginTop = '4000px';
    window.scrollTo(0, 0);
    (window as unknown as { __shellInsertions: number }).__shellInsertions = 0;
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement && node.classList.contains('usertour-widget-embed')) {
            (window as unknown as { __shellInsertions: number }).__shellInsertions += 1;
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  await sdk.advance(1000);
  await expect(sdk.page.locator(FRAME)).toHaveCount(1);
  expect(await sdk.isStarted('embed-1')).toBe(true);
  const insertions = await sdk.page.evaluate(
    () => (window as unknown as { __shellInsertions: number }).__shellInsertions,
  );
  expect(insertions).toBe(0);
});

test('an embed survives its target being replaced in place', async ({ sdk, protocol }) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Here', [], 'bottom-of-container-element'),
  );
  await expect(sdk.page.frameLocator(FRAME).getByText('Here')).toBeVisible();

  // The host re-renders the card: a new node with the same selector takes the
  // old one's place in the same tick. The watcher finds the new node and the
  // shell is moved into it — which reloads the iframe. The frame must be
  // rebuilt there, not left rendering into the old document.
  await sdk.page.evaluate(() => {
    const oldPanel = document.getElementById('panel') as HTMLElement;
    const newPanel = oldPanel.cloneNode(true) as HTMLElement;
    for (const shell of newPanel.querySelectorAll('.usertour-widget-embed')) {
      shell.remove();
    }
    newPanel.dataset.replaced = 'true';
    oldPanel.replaceWith(newPanel);
  });
  await sdk.advance(600);
  await expect(sdk.page.locator('#panel[data-replaced] > .usertour-widget-embed')).toHaveCount(1);
  await expect(sdk.page.frameLocator(FRAME).getByText('Here')).toBeVisible();
});

test('an embed beside its target stays put when the target is replaced in place', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Beside', [], 'immediately-after-element'),
  );
  await expect(sdk.page.frameLocator(FRAME).getByText('Beside')).toBeVisible();
  await sdk.page.locator(FRAME).evaluate((frame) => {
    (frame as HTMLElement).dataset.testFirstFrame = 'true';
  });
  await countShellRemovals(sdk.page);

  // The host swaps the target for a new node in the same place. The shell is
  // the target's sibling and already sits beside the new node: nothing moves,
  // and the frame keeps its document.
  await sdk.page.evaluate(() => {
    const oldPanel = document.getElementById('panel') as HTMLElement;
    const newPanel = oldPanel.cloneNode(true) as HTMLElement;
    newPanel.dataset.replaced = 'true';
    oldPanel.replaceWith(newPanel);
  });
  await sdk.advance(600);
  await expect(sdk.page.locator('#panel[data-replaced] + .usertour-widget-embed')).toHaveCount(1);
  await expect(sdk.page.frameLocator(FRAME).getByText('Beside')).toBeVisible();
  expect(await shellRemovals(sdk.page)).toBe(0);
  await expect(sdk.page.locator(`${FRAME}[data-test-first-frame]`)).toHaveCount(1);
});

test('an embed stays put while another widget kind loads', async ({ sdk, protocol }) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    oneStepEmbed(
      'embed-session-1',
      'embed-1',
      '#panel',
      'Staying',
      [],
      'bottom-of-container-element',
    ),
  );
  await expect(sdk.page.frameLocator(FRAME).getByText('Staying')).toBeVisible();
  await sdk.page.locator(FRAME).evaluate((frame) => {
    (frame as HTMLElement).dataset.testFirstFrame = 'true';
  });
  await countShellRemovals(sdk.page);

  // The first flow loads its widget chunk behind the Suspense boundary the
  // embed already renders under; the embed's shell must not be touched by it.
  await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
  await expect(sdk.frame().getByText('Welcome aboard')).toBeVisible();
  await sdk.advance(600);
  await expect(sdk.page.frameLocator(FRAME).getByText('Staying')).toBeVisible();
  expect(await shellRemovals(sdk.page)).toBe(0);
  await expect(sdk.page.locator(`${FRAME}[data-test-first-frame]`)).toHaveCount(1);
});

test('an embed whose target leaves the page unmounts and comes back with it', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push('AddEmbed', oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Here'));
  await expect(sdk.page.locator(FRAME)).toBeVisible();

  await sdk.page.evaluate(() => {
    (document.getElementById('panel') as HTMLElement).style.display = 'none';
  });
  await sdk.advance(600);
  await expect(sdk.page.locator(FRAME)).toHaveCount(0);

  await sdk.page.evaluate(() => {
    (document.getElementById('panel') as HTMLElement).style.display = '';
  });
  await sdk.advance(600);
  await expect(sdk.page.locator(FRAME)).toBeVisible();
});

test('an embed whose session is gone starts over when the server sends it without one', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  const buttons = [button('Learn more', [], { cvid: 'button-learn' })];
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Upgrade now', buttons),
  );
  const frame = sdk.page.frameLocator(FRAME);
  await expect(frame.getByText('Upgrade now')).toBeVisible();

  // The session was deleted on the server (the dashboard, the API): the next
  // sync delivers the same embed with none. Nothing stays on screen against a
  // session that no longer exists; the embed asks to start again.
  await protocol.push(
    'AddEmbed',
    oneStepEmbed(undefined, 'embed-1', '#panel', 'Upgrade now', buttons),
  );
  await protocol.waitForMessages('StartContent', 1);
  expect(protocol.messages('StartContent')[0].message.payload).toMatchObject({
    contentId: 'embed-1',
  });
  await expect(sdk.page.locator(FRAME)).toHaveCount(0);

  // The server records a new session and hands it back: the card is there
  // again, and what the user does is reported against the new session.
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-2', 'embed-1', '#panel', 'Upgrade now', buttons),
  );
  await expect(frame.getByText('Upgrade now')).toBeVisible();
  await frame.getByRole('button', { name: 'Learn more' }).click();
  await protocol.waitForMessages('ClickButton', 1);
  expect(protocol.messages('ClickButton')[0].message.payload).toMatchObject({
    sessionId: 'embed-session-2',
  });

  await frame.getByRole('button', { name: 'Close' }).click();
  await protocol.waitForMessages('EndContent', 1);
  expect(protocol.messages('EndContent')[0].message.payload).toEqual({
    sessionId: 'embed-session-2',
    endReason: 'dismiss_button',
  });
  await expect(sdk.page.locator(FRAME)).toHaveCount(0);
  expect(await sdk.isStarted('embed-1')).toBe(false);
});

test('an embed sent under another session is rebuilt, one sent under the same session is not', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  const buttons = [button('Learn more', [], { cvid: 'button-learn' })];
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Upgrade now', buttons),
  );
  const frame = sdk.page.frameLocator(FRAME);
  await expect(frame.getByText('Upgrade now')).toBeVisible();
  await sdk.page.locator(FRAME).evaluate((el) => el.setAttribute('data-test-first-frame', ''));
  const firstFrame = sdk.page.locator(`${FRAME}[data-test-first-frame]`);
  await countShellRemovals(sdk.page);

  // A re-send of the session it holds (a sync, a locale change) updates in place.
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Upgrade now', buttons),
  );
  await sdk.advance(600);
  await expect(frame.getByText('Upgrade now')).toBeVisible();
  expect(await shellRemovals(sdk.page)).toBe(0);
  await expect(firstFrame).toHaveCount(1);

  // Another session for the same content: the one it held has ended
  // elsewhere, so the card of that session goes and a new one takes its place.
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-2', 'embed-1', '#panel', 'Upgrade now', buttons),
  );
  await expect(firstFrame).toHaveCount(0);
  await expect(frame.getByText('Upgrade now')).toBeVisible();
  await frame.getByRole('button', { name: 'Learn more' }).click();
  await protocol.waitForMessages('ClickButton', 1);
  expect(protocol.messages('ClickButton')[0].message.payload).toMatchObject({
    sessionId: 'embed-session-2',
  });
});

test('an embed whose session is re-sent with another target moves to it', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Upgrade now'),
  );
  const frame = sdk.page.frameLocator(FRAME);
  await expect(frame.getByText('Upgrade now')).toBeVisible();
  const previous = () =>
    sdk.page.locator(SHELL).evaluate((shell) => shell.previousElementSibling?.id);
  expect(await previous()).toBe('panel');

  // The same session, edited to point at another element.
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#cta', 'Upgrade now'),
  );
  await expect.poll(previous).toBe('cta');
  await expect(sdk.page.locator(SHELL)).toHaveCount(1);
  await expect(frame.getByText('Upgrade now')).toBeVisible();
  expect(protocol.messages('EndContent')).toHaveLength(0);
});
