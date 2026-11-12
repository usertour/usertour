import type { Page } from '@playwright/test';
import { bannerSession, launcherSession, twoStepFlow } from './content';
import { type SdkPage, expect, test } from './fixtures';

/**
 * One target, every state the page can put it in, and what each kind of
 * content placed by it does. A tooltip step, a launcher and a banner all
 * follow their target through the same element watcher, so a change to how
 * the watcher judges a target reaches all three: each row of the table below
 * runs against each of them.
 *
 * A tooltip and a launcher point at their target, so it has to be laid out
 * with a size and be in the viewport; a tooltip whose target stays gone past
 * the theme's tolerance (3 s) ends the flow, a launcher waits for it. A banner
 * only sits beside its target, so any target in the page will do, whatever
 * its size and wherever it is scrolled.
 */

type TooltipOutcome = 'stays' | 'hides' | 'ends';
type PresenceOutcome = 'shows' | 'hides';

type TargetState = {
  /** Reads after "whose target is". */
  name: string;
  apply: (page: Page) => Promise<void>;
  /** Back to the state the target started in. */
  undo: (page: Page) => Promise<void>;
  tooltip: TooltipOutcome;
  launcher: PresenceOutcome;
  banner: PresenceOutcome;
};

const style = (page: Page, css: string) =>
  page.evaluate((css) => {
    (document.getElementById('anchor') as HTMLElement).style.cssText = css;
  }, css);
const styleBox = (page: Page, css: string) =>
  page.evaluate((css) => {
    (document.getElementById('anchor-box') as HTMLElement).style.cssText = css;
  }, css);

const STATES: TargetState[] = [
  {
    name: 'scrolled out of the page',
    apply: (page) => page.evaluate(() => window.scrollTo(0, 3000)),
    undo: (page) => page.evaluate(() => window.scrollTo(0, 0)),
    tooltip: 'hides',
    launcher: 'hides',
    banner: 'shows',
  },
  {
    name: 'removed from the page',
    apply: (page) =>
      page.evaluate(() => {
        const anchor = document.getElementById('anchor') as HTMLElement;
        (window as unknown as { __anchor: HTMLElement }).__anchor = anchor;
        anchor.remove();
      }),
    undo: (page) =>
      page.evaluate(() => {
        const anchor = (window as unknown as { __anchor: HTMLElement }).__anchor;
        document.getElementById('anchor-box')?.appendChild(anchor);
      }),
    tooltip: 'ends',
    launcher: 'hides',
    banner: 'hides',
  },
  {
    name: 'hidden by display: none on its container',
    apply: (page) => styleBox(page, 'display:none'),
    undo: (page) => styleBox(page, ''),
    tooltip: 'ends',
    launcher: 'hides',
    banner: 'hides',
  },
  {
    name: 'hidden by visibility: hidden',
    apply: (page) => style(page, 'visibility:hidden'),
    undo: (page) => style(page, ''),
    tooltip: 'ends',
    launcher: 'hides',
    banner: 'hides',
  },
  {
    name: 'faded out to opacity 0 with its container',
    apply: (page) => styleBox(page, 'opacity:0'),
    undo: (page) => styleBox(page, ''),
    tooltip: 'ends',
    launcher: 'hides',
    banner: 'hides',
  },
  {
    // A container whose children are out of its flow: a line to point at.
    name: 'given a width but no height',
    apply: (page) => style(page, 'height:0'),
    undo: (page) => style(page, ''),
    tooltip: 'stays',
    launcher: 'shows',
    banner: 'shows',
  },
  {
    // A point with nowhere to point; still a place to put a banner by.
    name: 'shrunk to neither a width nor a height',
    apply: (page) => style(page, 'width:0;height:0;overflow:hidden'),
    undo: (page) => style(page, ''),
    tooltip: 'ends',
    launcher: 'hides',
    banner: 'shows',
  },
];

const start = async (sdk: SdkPage) => {
  await sdk.init();
  await sdk.identify('u1');
  // The target, in a box of its own, at the top of a page tall enough to scroll it away.
  await sdk.page.evaluate(() => {
    const box = document.createElement('div');
    box.id = 'anchor-box';
    const anchor = document.createElement('div');
    anchor.id = 'anchor';
    anchor.textContent = 'Anchor';
    box.appendChild(anchor);
    document.querySelector('main')?.prepend(box);
    const spacer = document.createElement('div');
    spacer.style.height = '4000px';
    document.body.appendChild(spacer);
  });
};

/** Well past the tooltip's tolerance (3 s) and the watcher's 200ms checks. */
const LONG_AFTER = 5_000;
const NEXT_CHECKS = 400;

const TOOLTIP_TEXT = 'Click here to begin';
const TOOLTIP_DOES: Record<TooltipOutcome, string> = {
  stays: 'keeps its tooltip',
  hides: 'hides its tooltip while it is, keeps the flow, and shows it again after',
  ends: 'ends the flow at the tolerance',
};
const PRESENCE_DOES: Record<PresenceOutcome, string> = {
  shows: 'stays',
  hides: 'goes while it is and comes back after',
};

test.describe('a tooltip step', () => {
  for (const state of STATES) {
    test(`whose target is ${state.name} ${TOOLTIP_DOES[state.tooltip]}`, async ({
      sdk,
      protocol,
    }) => {
      await start(sdk);
      await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#anchor'));
      await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });
      await expect(sdk.frame().getByText(TOOLTIP_TEXT)).toBeVisible();

      await state.apply(sdk.page);
      await sdk.advance(NEXT_CHECKS);
      if (state.tooltip === 'ends') {
        await sdk.advance(LONG_AFTER);
        await protocol.waitForMessages('EndContent', 1);
        expect(protocol.messages('EndContent')[0].message.payload).toMatchObject({
          sessionId: 'session-1',
          endReason: 'tooltip_target_missing',
        });
        return;
      }
      if (state.tooltip === 'hides') {
        await expect(sdk.surface).toBeHidden();
      } else {
        await expect(sdk.frame().getByText(TOOLTIP_TEXT)).toBeVisible();
      }
      await sdk.advance(LONG_AFTER);
      await sdk.page.waitForTimeout(200);
      expect(protocol.messages('EndContent')).toHaveLength(0);

      await state.undo(sdk.page);
      await sdk.advance(NEXT_CHECKS);
      await expect(sdk.frame().getByText(TOOLTIP_TEXT)).toBeVisible();
    });
  }

  test('whose target comes back before the tolerance keeps the flow', async ({ sdk, protocol }) => {
    const removed = STATES.find((state) => state.name === 'removed from the page') as TargetState;
    await start(sdk);
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#anchor'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });
    await expect(sdk.frame().getByText(TOOLTIP_TEXT)).toBeVisible();

    await removed.apply(sdk.page);
    await sdk.advance(2_000);
    await expect(sdk.surface).toBeHidden();
    await removed.undo(sdk.page);
    await sdk.advance(NEXT_CHECKS);
    await expect(sdk.frame().getByText(TOOLTIP_TEXT)).toBeVisible();

    await sdk.advance(LONG_AFTER);
    await sdk.page.waitForTimeout(200);
    expect(protocol.messages('EndContent')).toHaveLength(0);
  });
});

test.describe('a launcher', () => {
  const launchers = (sdk: SdkPage) => sdk.page.locator('.usertour-widget-launcher');

  for (const state of STATES) {
    test(`whose target is ${state.name} ${PRESENCE_DOES[state.launcher]}`, async ({
      sdk,
      protocol,
    }) => {
      await start(sdk);
      await protocol.push(
        'AddLauncher',
        launcherSession({
          sessionId: 'launcher-session-1',
          contentId: 'launcher-1',
          target: '#anchor',
          text: 'Start here',
        }),
      );
      await sdk.advance(NEXT_CHECKS);
      await expect(launchers(sdk)).toBeVisible();

      await state.apply(sdk.page);
      await sdk.advance(NEXT_CHECKS);
      if (state.launcher === 'shows') {
        await sdk.advance(LONG_AFTER);
        await expect(launchers(sdk)).toBeVisible();
        return;
      }
      await expect(launchers(sdk)).toHaveCount(0);
      await sdk.advance(LONG_AFTER);
      await state.undo(sdk.page);
      await sdk.advance(NEXT_CHECKS);
      await expect(launchers(sdk)).toBeVisible();
      expect(protocol.messages('DismissLauncher')).toHaveLength(0);
    });
  }
});

test.describe('a banner placed after its target', () => {
  const mount = (sdk: SdkPage) => sdk.page.locator('.usertour-widget-banner');
  const content = (sdk: SdkPage) =>
    sdk.page
      .locator('iframe.usertour-widget-banner-frame')
      .filter({ visible: true })
      .contentFrame();

  for (const state of STATES) {
    test(`whose target is ${state.name} ${PRESENCE_DOES[state.banner]}`, async ({
      sdk,
      protocol,
    }) => {
      await start(sdk);
      await protocol.push(
        'SetBannerSession',
        bannerSession({
          sessionId: 'banner-session-1',
          contentId: 'banner-1',
          text: 'Maintenance tonight',
          placement: 'immediately-after-element',
          container: '#anchor',
        }),
      );
      await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();

      await state.apply(sdk.page);
      await sdk.advance(NEXT_CHECKS);
      if (state.banner === 'shows') {
        await sdk.advance(LONG_AFTER);
        await expect(mount(sdk)).toHaveCount(1);
        await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();
        return;
      }
      await expect(mount(sdk)).toHaveCount(0);
      await state.undo(sdk.page);
      await sdk.advance(NEXT_CHECKS);
      await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();
      expect(protocol.messages('EndContent')).toHaveLength(0);
    });
  }
});
