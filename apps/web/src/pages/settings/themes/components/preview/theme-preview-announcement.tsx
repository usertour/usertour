import { PREVIEW_BASIC } from '@usertour/constants';
import type { PopupAnnouncement, ThemeTypesSetting } from '@usertour/types';
import { AnnouncementDistribution, AnnouncementPopupStyle } from '@usertour/types';
import {
  ANNOUNCEMENT_BUBBLE_TAIL_SIZE,
  AnnouncementBubbleShell,
  AnnouncementPopupBody,
  Popper,
  useSettingsStyles,
} from '@usertour/widget';
import { useMemo } from 'react';
import { ANNOUNCEMENT_PREVIEW_CONTENT } from '../../constants/preview-contents';

interface ThemePreviewAnnouncementProps {
  settings?: ThemeTypesSetting;
}

const PREVIEW_OFFSET = 40;

const noop = () => {
  // Preview interactions have no effect.
};

/**
 * Preview of the announcement popup's speech-bubble presentation, rendered
 * through the real widget components (AnnouncementBubbleShell +
 * AnnouncementPopupBody with a mock payload) over a mock launcher disc, so
 * theme changes — announcement.bubbleWidth, colors, fonts, the link-style
 * Read more — are reflected exactly as the live popup renders them.
 */
export const ThemePreviewAnnouncement = (props: ThemePreviewAnnouncementProps) => {
  const { settings } = props;
  const { globalStyle, themeSetting } = useSettingsStyles(settings as ThemeTypesSetting);

  const width = themeSetting?.announcement?.bubbleWidth ?? 480;
  const launcherHeight = themeSetting?.resourceCenterLauncherButton?.height ?? 60;

  const popup = useMemo<PopupAnnouncement>(
    () => ({
      id: 'preview',
      versionId: 'preview',
      title: 'New feature announcement',
      content: ANNOUNCEMENT_PREVIEW_CONTENT,
      moreEnabled: true,
      moreButtonText: 'Read more',
      level: AnnouncementDistribution.POPUP,
      time: new Date().toISOString(),
      moreContent: null,
      popupConfig: { style: AnnouncementPopupStyle.BUBBLE },
    }),
    [],
  );

  return (
    <div className="h-full w-full scale-100">
      <Popper open={true} zIndex={PREVIEW_BASIC} globalStyle={globalStyle}>
        <AnnouncementBubbleShell
          width={width}
          alignLeft={false}
          alignTop={false}
          launcherHeight={launcherHeight}
          tailColor={themeSetting?.mainColor?.background}
          style={{
            position: 'fixed',
            // The surface class pins top/left to 0 — explicitly release them
            // (computePositionStyle does the same for live surfaces).
            top: 'auto',
            left: 'auto',
            right: PREVIEW_OFFSET,
            bottom: PREVIEW_OFFSET + launcherHeight + ANNOUNCEMENT_BUBBLE_TAIL_SIZE,
          }}
        >
          <AnnouncementPopupBody popup={popup} onDismiss={noop} onReadMore={noop} />
        </AnnouncementBubbleShell>
        {/* Mock launcher disc, so the tail visibly points at something. */}
        <div
          className="flex items-center justify-center text-2xl font-bold text-white usertour-widget-elevation"
          style={{
            position: 'fixed',
            top: 'auto',
            left: 'auto',
            right: PREVIEW_OFFSET,
            bottom: PREVIEW_OFFSET,
            width: launcherHeight,
            height: launcherHeight,
            borderRadius: '50%',
            backgroundColor: themeSetting?.brandColor?.background,
          }}
          aria-hidden="true"
        >
          ?
        </div>
      </Popper>
    </div>
  );
};
