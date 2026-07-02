import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Frame, useFrame } from '@usertour/frame';
import { useSize } from '@usertour/react-use-size';
import type {
  ContentEditorClickableElement,
  PopupAnnouncement,
  UserTourTypes,
} from '@usertour/types';
import { AnnouncementPopupStyle, ResourceCenterBlockType } from '@usertour/types';
import { ContentEditorSerialize } from '../../serialize/content-editor-serialize';
import { Button } from '../../primitives';
import { WidgetClass } from '../class-names';
import { PopperClose } from '../popper';
import { computePositionStyle } from '../utils/position';
import { useSettingsStyles } from '../hooks/use-settings-styles';
import { AnnouncementReadMoreButton, formatAnnouncementDate } from './resource-center-body';
import { RESOURCE_CENTER_DEFAULTS, resourceCenterPlacementToPosition } from './constants';
import { useResourceCenterContext } from './context';

// ============================================================================
// Announcement popup — a POPUP-level announcement self-presenting once, either
// as a centered modal or a speech bubble anchored at the launcher. Gating
// (panel expanded / launcher hidden / live chat active / already seen) happens
// in the SDK: when context.popupAnnouncement is set, this component renders it.
//
// The popup lives inside the resource center's stage/root container (one stage
// per widget instance — it deliberately does NOT use the Popper root, which
// would nest a second stage). The shells are composed from context-free
// primitives; the iframe body gets the announcement's own theme (payload
// themeSettings, falling back to the RC theme), while the shell inherits the
// RC stage's variables.
// ============================================================================

type FrameAssets = React.ComponentProps<typeof Frame>['assets'];

/**
 * Iframe inner wrapper: injects the announcement theme onto the frame body and
 * mirrors the content height onto the frame element so the surface hugs its
 * content (the same job PopperContentInFrame does for flow steps).
 */
interface PopupFrameContentProps {
  globalStyle: string;
  children: React.ReactNode;
}

const PopupFrameContent = (props: PopupFrameContentProps) => {
  const { globalStyle, children } = props;
  const { setStyle, document: frameDocument } = useFrame();
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(null);
  const rect = useSize(contentElement);

  useEffect(() => {
    if (globalStyle) {
      frameDocument.body.style.cssText = globalStyle;
      frameDocument.body.className = 'usertour-widget-root';
    }
  }, [globalStyle, frameDocument]);

  useEffect(() => {
    if (rect) {
      setStyle(`height: ${rect.height}px !important`);
    }
  }, [rect, setStyle]);

  return <div ref={setContentElement}>{children}</div>;
};

export interface AnnouncementPopupBodyProps {
  popup: PopupAnnouncement;
  onDismiss: () => void;
  /** Read more — opens the RC on the announcement detail page (both variants). */
  onReadMore?: () => void;
  /** Content action handler (from the RC context in the live popup). */
  onContentClick?: (element: ContentEditorClickableElement) => Promise<void>;
  userAttributes?: UserTourTypes.Attributes;
  /**
   * bubble (default): unread dot + base-size title, date line, right-aligned
   * link-style Read more. modal: h1 title, no dot/date, centered primary
   * Read more.
   */
  variant?: 'bubble' | 'modal';
}

/**
 * The popup's content — purely presentational: the live popup feeds it
 * RC-context values; the theme-builder preview renders it with a mock
 * payload.
 */
export const AnnouncementPopupBody = (props: AnnouncementPopupBodyProps) => {
  const {
    popup,
    onDismiss,
    onReadMore,
    onContentClick,
    userAttributes,
    variant = 'bubble',
  } = props;
  const isModal = variant === 'modal';

  // The popup renders outside the RC session, so its referenced attributes
  // aren't in the session's userAttributes; the payload carries their resolved
  // values (same merge as the feed).
  const mergedAttributes = useMemo(
    () => ({ ...userAttributes, ...popup.attributes }),
    [userAttributes, popup.attributes],
  );

  // A content action (start flow, navigate, ...) is an acknowledgment —
  // dismiss (which marks seen) after running it, so the popup doesn't chase
  // the user onto the next page.
  const handleContentClick = useCallback(
    async (element: ContentEditorClickableElement) => {
      await onContentClick?.(element);
      onDismiss();
    },
    [onContentClick, onDismiss],
  );

  const handleReadMore = useCallback(() => {
    onReadMore?.();
  }, [onReadMore]);

  const showReadMore = popup.moreEnabled;

  return (
    // surfacePanel carries the theme's padding (--usertour-widget-popper-
    // padding: modal.padding for the modal, 24px default for the bubble),
    // background, radius, and border — the same shell flow content uses.
    <div
      className={`${WidgetClass.surfacePanel} relative flex flex-col gap-2 font-sdk text-sdk-base text-sdk-foreground`}
    >
      <PopperClose onClick={onDismiss} />
      {isModal ? (
        <h1 className="text-sdk-h1 font-sdk-bold pr-8">{popup.title}</h1>
      ) : (
        <>
          <div className="flex items-center gap-2 pr-8">
            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-sdk-resource-center-badge-background" />
            <h3 className="font-sdk-bold">{popup.title}</h3>
          </div>
          {popup.time && (
            <div className="text-xs text-sdk-foreground/50">
              {formatAnnouncementDate(popup.time)}
            </div>
          )}
        </>
      )}
      <ContentEditorSerialize
        contents={popup.content}
        onClick={handleContentClick}
        userAttributes={mergedAttributes}
      />
      {showReadMore &&
        (isModal ? (
          <div className="flex justify-center pt-2">
            <Button variant="default" onClick={handleReadMore}>
              {popup.moreButtonText || 'Read more'}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <AnnouncementReadMoreButton label={popup.moreButtonText} onClick={handleReadMore} />
          </div>
        ))}
    </div>
  );
};

// ============================================================================
// Modal presentation
// ============================================================================

interface AnnouncementPopupModalProps {
  popup: PopupAnnouncement;
  assets?: FrameAssets;
  onDismiss: () => void;
  onReadMore: () => void;
}

const AnnouncementPopupModal = (props: AnnouncementPopupModalProps) => {
  const { popup, assets, onDismiss, onReadMore } = props;
  const {
    themeSettings: resourceCenterThemeSettings,
    zIndex,
    onContentClick,
    userAttributes,
  } = useResourceCenterContext();
  // type 'modal' resolves --usertour-widget-popper-padding to the theme's
  // modal.padding (same as flow modal steps).
  const { globalStyle, themeSetting } = useSettingsStyles(
    popup.themeSettings ?? resourceCenterThemeSettings,
    { type: 'modal' },
  );
  const width = themeSetting?.announcement?.modalWidth ?? 600;

  return (
    <>
      <div
        className={`${WidgetClass.overlay} ${WidgetClass.announcementModalOverlay}`}
        style={{ position: 'fixed', visibility: 'visible', zIndex: zIndex + 2 }}
        onClick={onDismiss}
      />
      <div
        className={`${WidgetClass.surface} ${WidgetClass.elevation} ${WidgetClass.announcementModal}`}
        style={{ ...computePositionStyle('center', 0, 0), width: `${width}px`, zIndex: zIndex + 3 }}
      >
        <div className={WidgetClass.surfaceShell}>
          <div className={WidgetClass.surfaceFrame}>
            <Frame assets={assets} className={WidgetClass.surfaceViewport}>
              <PopupFrameContent globalStyle={globalStyle}>
                <AnnouncementPopupBody
                  popup={popup}
                  onDismiss={onDismiss}
                  onReadMore={onReadMore}
                  onContentClick={onContentClick}
                  userAttributes={userAttributes}
                  variant="modal"
                />
              </PopupFrameContent>
            </Frame>
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// Bubble presentation — a speech bubble whose notch points at the resource
// center launcher below it: the launcher is the speaker, so there is no
// separate avatar.
// ============================================================================

const BUBBLE_TAIL_SIZE = 24;

/**
 * The bubble's pure visual shell: card (surface/shell/frame) plus the
 * speech-bubble tail. The tail uses the flow bubble notch's exact geometry —
 * a border-drawn right triangle whose box sits at the launcher-size edge
 * (offsetX = avatarSize there, launcherHeight here), so the sharp corner
 * lands on the launcher's inner corner. It overlaps the card's edge by 1px —
 * the flow bubble hides that seam behind its avatar; we have no avatar, so
 * the overlap does the job. Shared by the live popup (iframe content) and the
 * theme-builder preview (DOM content).
 */
export interface AnnouncementBubbleShellProps {
  width: number;
  alignLeft: boolean;
  alignTop: boolean;
  launcherHeight: number;
  tailColor?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const AnnouncementBubbleShell = (props: AnnouncementBubbleShellProps) => {
  const { width, alignLeft, alignTop, launcherHeight, tailColor, style, children } = props;

  const tailStyle: React.CSSProperties = {
    position: 'absolute',
    ...(alignTop ? { top: -(BUBBLE_TAIL_SIZE - 1) } : { bottom: -(BUBBLE_TAIL_SIZE - 1) }),
    ...(alignLeft ? { left: launcherHeight } : { right: launcherHeight }),
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: alignTop ? 0 : BUBBLE_TAIL_SIZE,
    borderBottomWidth: alignTop ? BUBBLE_TAIL_SIZE : 0,
    borderLeftWidth: alignLeft ? 0 : BUBBLE_TAIL_SIZE,
    borderRightWidth: alignLeft ? BUBBLE_TAIL_SIZE : 0,
    borderTopColor: alignTop ? 'transparent' : tailColor,
    borderBottomColor: alignTop ? tailColor : 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    pointerEvents: 'none',
  };

  return (
    <div
      className={`${WidgetClass.surface} ${WidgetClass.elevation} ${WidgetClass.announcementBubble}`}
      style={{ ...style, width: `${width}px` }}
    >
      <div className={WidgetClass.surfaceShell}>
        <div style={tailStyle} aria-hidden="true" />
        <div className={WidgetClass.surfaceFrame}>{children}</div>
      </div>
    </div>
  );
};

/** The tail is the connector between the card and the launcher — the card
 * sits exactly one tail-height away, no gap. */
export const ANNOUNCEMENT_BUBBLE_TAIL_SIZE = BUBBLE_TAIL_SIZE;

interface AnnouncementPopupBubbleProps {
  popup: PopupAnnouncement;
  assets?: FrameAssets;
  onDismiss: () => void;
  onReadMore: () => void;
}

const AnnouncementPopupBubble = (props: AnnouncementPopupBubbleProps) => {
  const { popup, assets, onDismiss, onReadMore } = props;
  const {
    themeSettings: resourceCenterThemeSettings,
    themeSetting: resourceCenterThemeSetting,
    zIndex,
    onContentClick,
    userAttributes,
  } = useResourceCenterContext();
  const { globalStyle, themeSetting } = useSettingsStyles(
    popup.themeSettings ?? resourceCenterThemeSettings,
  );

  const width = themeSetting?.announcement?.bubbleWidth ?? 480;

  // Full four-quadrant handling, like the flow bubble's useAnchorPosition: the
  // launcher placement decides both sides. Bottom placements put the card
  // above the launcher with the tail pointing down; top placements flip it.
  // The bubble grows toward the viewport center.
  const resourceCenter = resourceCenterThemeSetting.resourceCenter;
  const placement = resourceCenter?.placement ?? RESOURCE_CENTER_DEFAULTS.placement;
  const alignLeft = String(placement).includes('left');
  const alignTop = String(placement).includes('top');
  const position = resourceCenterPlacementToPosition(placement);
  const launcherHeight = resourceCenterThemeSetting.resourceCenterLauncherButton?.height ?? 60;
  const positionOffsetX = resourceCenter?.offsetX ?? RESOURCE_CENTER_DEFAULTS.offsetX;
  const positionOffsetY =
    (resourceCenter?.offsetY ?? RESOURCE_CENTER_DEFAULTS.offsetY) +
    launcherHeight +
    BUBBLE_TAIL_SIZE;

  const positionStyle = computePositionStyle(position, positionOffsetX, positionOffsetY);

  return (
    <AnnouncementBubbleShell
      width={width}
      alignLeft={alignLeft}
      alignTop={alignTop}
      launcherHeight={launcherHeight}
      tailColor={themeSetting?.mainColor?.background}
      style={{ ...positionStyle, zIndex: zIndex + 1 }}
    >
      <Frame assets={assets} className={WidgetClass.surfaceViewport}>
        <PopupFrameContent globalStyle={globalStyle}>
          <AnnouncementPopupBody
            popup={popup}
            onDismiss={onDismiss}
            onReadMore={onReadMore}
            onContentClick={onContentClick}
            userAttributes={userAttributes}
          />
        </PopupFrameContent>
      </Frame>
    </AnnouncementBubbleShell>
  );
};

// ============================================================================
// Entry — picks the presentation from popupConfig.style
// ============================================================================

export interface ResourceCenterAnnouncementPopupProps {
  assets?: FrameAssets;
}

export const ResourceCenterAnnouncementPopup = memo(
  (props: ResourceCenterAnnouncementPopupProps) => {
    const { assets } = props;
    const { popupAnnouncement, onPopupDismiss, data, actions, handleExpandedChange } =
      useResourceCenterContext();

    const handleDismiss = useCallback(() => {
      onPopupDismiss?.();
    }, [onPopupDismiss]);

    // Bubble "Read more": open the RC on the announcement detail page, then
    // dismiss (which marks seen). switchTab first — the detail ref resolves
    // its block against the active tab.
    const handleReadMore = useCallback(() => {
      if (!popupAnnouncement) {
        return;
      }
      for (const tab of data.tabs ?? []) {
        const block = tab.blocks.find((item) => item.type === ResourceCenterBlockType.ANNOUNCEMENT);
        if (block) {
          actions.switchTab(tab.id);
          // Push the list page under the detail page, so Back walks
          // detail → announcement list → home instead of skipping the list.
          actions.push({
            type: ResourceCenterBlockType.ANNOUNCEMENT,
            blockId: block.id,
          });
          actions.push({
            type: 'announcement_detail',
            blockId: block.id,
            announcementId: popupAnnouncement.id,
          });
          break;
        }
      }
      handleExpandedChange(true);
      onPopupDismiss?.();
    }, [popupAnnouncement, data.tabs, actions, handleExpandedChange, onPopupDismiss]);

    if (!popupAnnouncement) {
      return null;
    }

    if (popupAnnouncement.popupConfig.style === AnnouncementPopupStyle.MODAL) {
      return (
        <AnnouncementPopupModal
          popup={popupAnnouncement}
          assets={assets}
          onDismiss={handleDismiss}
          onReadMore={handleReadMore}
        />
      );
    }
    return (
      <AnnouncementPopupBubble
        popup={popupAnnouncement}
        assets={assets}
        onDismiss={handleDismiss}
        onReadMore={handleReadMore}
      />
    );
  },
);

ResourceCenterAnnouncementPopup.displayName = 'ResourceCenterAnnouncementPopup';
