import {
  announcementBlock,
  announcementItem,
  contentListBlock,
  evaluateJs,
  popupAnnouncement,
  resourceCenterSession,
  richTextBlock,
} from './content';
import { type SdkPage, expect, test } from './fixtures';
import { defaultAnswer } from './protocol-server';

/**
 * The resource center's blocks beyond opening and closing: an action block
 * running its actions, a content list fetched from the server and starting
 * what is clicked, the announcement feed marking what it shows as seen, and
 * a popup announcement presenting itself while the panel is closed.
 */

const start = async (sdk: SdkPage) => {
  await sdk.init();
  await sdk.identify('u1');
};

const SESSION = 'rc-session-1';

const resourceCenter = (overrides: Partial<Parameters<typeof resourceCenterSession>[0]> = {}) =>
  resourceCenterSession({ sessionId: SESSION, contentId: 'rc-1', actions: [], ...overrides });

const panel = (sdk: SdkPage) =>
  sdk.page.frameLocator('iframe.usertour-widget-resource-center-frame');
/** The unread badge on the launcher, in a frame of its own. */
const badgeFrame = (sdk: SdkPage) => sdk.page.locator('iframe.usertour-widget-indicator');
const badge = (sdk: SdkPage) => sdk.page.frameLocator('iframe.usertour-widget-indicator');
/** The popup announcement, drawn like a flow step. */
const popupFrame = (sdk: SdkPage) => sdk.page.locator('iframe.usertour-widget-surface-viewport');

const openPanel = (sdk: SdkPage) => panel(sdk).getByRole('button', { name: 'Open Help' }).click();
const closePanel = (sdk: SdkPage) =>
  panel(sdk).getByRole('button', { name: 'Close resource center' }).click();

const RUN = "window.__usertourRecorded.ran = ['yes']";

test('an action block runs its actions and closes the panel', async ({ sdk, protocol }) => {
  await start(sdk);
  await protocol.push(
    'SetResourceCenterSession',
    resourceCenter({
      actions: [{ id: 'block-video', name: 'Watch the video', clickedActions: [evaluateJs(RUN)] }],
    }),
  );
  await openPanel(sdk);
  await panel(sdk).getByRole('button', { name: 'Watch the video' }).click();
  await protocol.waitForMessages('ClickResourceCenter', 1);
  expect(protocol.messages('ClickResourceCenter')[0].message.payload).toEqual({
    sessionId: SESSION,
    blockId: 'block-video',
  });
  await expect.poll(() => sdk.recorded('ran')).toEqual(['yes']);
  await protocol.waitForMessages('CloseResourceCenter', 1);
  await expect(panel(sdk).getByText('How can we help?')).toBeHidden();
});

test('a content list asks the server for its items; an item starts its content, navigates and closes the panel', async ({
  sdk,
  protocol,
}) => {
  protocol.answer = (message, connection) =>
    message.kind === 'ListResourceCenterBlockContent'
      ? [
          { contentId: 'flow-9', contentType: 'flow', name: 'Getting started' },
          { contentId: 'checklist-2', contentType: 'checklist', name: 'Setup checklist' },
        ]
      : defaultAnswer(message, connection);
  await start(sdk);
  const opened = await sdk.stubNavigation();
  await protocol.push(
    'SetResourceCenterSession',
    resourceCenter({
      blocks: [
        richTextBlock('block-intro', 'How can we help?'),
        contentListBlock('block-guides', 'Guides', [
          { contentId: 'flow-9', label: 'Take the tour', navigateUrl: '/guides' },
          { contentId: 'checklist-2', contentType: 'checklist' },
        ]),
      ],
    }),
  );
  await openPanel(sdk);
  await panel(sdk).getByRole('button', { name: 'Guides' }).click();
  await protocol.waitForMessages('ListResourceCenterBlockContent', 1);
  expect(protocol.messages('ListResourceCenterBlockContent')[0].message.payload).toEqual({
    sessionId: SESSION,
    blockId: 'block-guides',
  });
  // The block's own label wins over the server's name; the other keeps the server's.
  await expect(panel(sdk).getByRole('button', { name: 'Take the tour' })).toBeVisible();
  await expect(panel(sdk).getByRole('button', { name: 'Setup checklist' })).toBeVisible();

  await panel(sdk).getByRole('button', { name: 'Take the tour' }).click();
  await protocol.waitForMessages('StartContent', 1);
  expect(protocol.messages('StartContent')[0].message.payload).toEqual({
    contentId: 'flow-9',
    startReason: 'start_from_action',
  });
  await expect.poll(opened).toEqual([{ url: '/guides', target: '_self' }]);
  await protocol.waitForMessages('CloseResourceCenter', 1);
});

test('the announcement feed lists what the server has, marks the unseen ones seen and lowers the badge', async ({
  sdk,
  protocol,
}) => {
  protocol.answer = (message, connection) =>
    message.kind === 'ListAnnouncements'
      ? {
          announcements: [
            announcementItem('a1', 'Dark mode is here', 'Switch it on in settings.'),
            announcementItem('a2', 'Weekly reports', 'A digest every Monday.'),
            announcementItem('a3', 'Welcome aboard', 'Thanks for joining.', true),
          ],
        }
      : defaultAnswer(message, connection);
  await start(sdk);
  await protocol.push(
    'SetResourceCenterSession',
    resourceCenter({
      unreadCount: 2,
      blocks: [
        richTextBlock('block-intro', 'How can we help?'),
        announcementBlock('block-news', 'What’s new'),
      ],
    }),
  );
  await expect(badge(sdk).getByText('2', { exact: true })).toBeVisible();

  await openPanel(sdk);
  await panel(sdk).getByRole('button', { name: 'What’s new' }).click();
  await protocol.waitForMessages('ListAnnouncements', 1);
  for (const title of ['Dark mode is here', 'Weekly reports', 'Welcome aboard']) {
    await expect(panel(sdk).getByRole('heading', { name: title })).toBeVisible();
  }
  // Showing the feed is what marks them seen: one batch, the unseen ones only.
  await protocol.waitForMessages('MarkAnnouncementsSeen', 1);
  expect(protocol.messages('MarkAnnouncementsSeen')[0].message.payload).toEqual({
    items: [{ contentId: 'a1' }, { contentId: 'a2' }],
  });

  await closePanel(sdk);
  await expect(badgeFrame(sdk)).toHaveCount(0);
});

test('a popup announcement shows while the panel is closed; closing it marks it seen', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'SetResourceCenterSession',
    resourceCenter({
      unreadCount: 1,
      popup: popupAnnouncement('a1', 'Dark mode is here', 'Switch it on in settings.'),
      blocks: [richTextBlock('block-intro', 'How can we help?')],
    }),
  );
  await expect(sdk.frame().getByText('Dark mode is here')).toBeVisible();
  await expect(badge(sdk).getByText('1', { exact: true })).toBeVisible();

  // Opening the panel puts the popup away; closing it brings it back unseen.
  await openPanel(sdk);
  await expect(popupFrame(sdk)).toHaveCount(0);
  await closePanel(sdk);
  await expect(sdk.frame().getByText('Dark mode is here')).toBeVisible();
  expect(protocol.messages('MarkAnnouncementsSeen')).toHaveLength(0);

  await sdk.frame().getByRole('button', { name: 'Close' }).click();
  await protocol.waitForMessages('MarkAnnouncementsSeen', 1);
  expect(protocol.messages('MarkAnnouncementsSeen')[0].message.payload).toEqual({
    items: [{ contentId: 'a1' }],
    source: 'bubble',
  });
  await expect(popupFrame(sdk)).toHaveCount(0);
  await expect(badgeFrame(sdk)).toHaveCount(0);
});
