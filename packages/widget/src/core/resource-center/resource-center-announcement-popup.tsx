import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Frame, useFrame } from '@usertour/frame';
import { useSize } from '@usertour/react-use-size';
import type { ContentEditorClickableElement, PopupAnnouncement } from '@usertour/types';
import { AnnouncementPopupStyle, ResourceCenterBlockType } from '@usertour/types';
import { DEFAULT_POPUP_MODAL_WIDTH } from '@usertour/constants';
import { ContentEditorSerialize } from '../../serialize/content-editor-serialize';
import { Button } from '../../primitives';
import { PopperAvatarNotch } from '../bubble';
import { WidgetClass } from '../class-names';
import { PopperClose } from '../popper';
import { computePositionStyle } from '../utils/position';
import { useSettingsStyles } from '../hooks/use-settings-styles';
import { formatAnnouncementDate } from './resource-center-body';
import { RESOURCE_CENTER_DEFAULTS } from './constants';
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

interface AnnouncementPopupBodyProps {
  popup: PopupAnnouncement;
  onDismiss: () => void;
  /**
   * Bubble: navigate to the RC detail view. Omitted for the modal, which
   * expands the detail content inline — it has the space, so no navigation.
   */
  onReadMore?: () => void;
}

const AnnouncementPopupBody = (props: AnnouncementPopupBodyProps) => {
  const { popup, onDismiss, onReadMore } = props;
  const { onContentClick, userAttributes } = useResourceCenterContext();
  const [inlineExpanded, setInlineExpanded] = useState(false);

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
    if (onReadMore) {
      onReadMore();
      return;
    }
    setInlineExpanded(true);
  }, [onReadMore]);

  const showReadMore = popup.moreEnabled && !inlineExpanded;

  return (
    <div className="relative flex flex-col gap-2 p-4 font-sdk text-sdk-base text-sdk-foreground">
      <PopperClose onClick={onDismiss} />
      <div className="flex items-center gap-2 pr-8">
        <span className="flex-shrink-0 h-2 w-2 rounded-full bg-sdk-resource-center-badge-background" />
        <h3 className="font-sdk-bold">{popup.title}</h3>
      </div>
      {popup.time && (
        <div className="text-xs text-sdk-foreground/50">{formatAnnouncementDate(popup.time)}</div>
      )}
      <ContentEditorSerialize
        contents={popup.content}
        onClick={handleContentClick}
        userAttributes={mergedAttributes}
      />
      {inlineExpanded && popup.moreContent && (
        <ContentEditorSerialize
          contents={popup.moreContent}
          onClick={handleContentClick}
          userAttributes={mergedAttributes}
        />
      )}
      {showReadMore && (
        <div className="flex justify-end">
          {/* Link-style button (same idiom as the checklist dismiss link):
              text-sdk-link is the theme's linkColor. */}
          <Button
            variant="custom"
            className="inline-flex items-center gap-1 text-sdk-link hover:text-sdk-link/80 font-sdk-bold cursor-pointer"
            onClick={handleReadMore}
          >
            {popup.moreButtonText || 'Read more'}
            <span aria-hidden="true">→</span>
          </Button>
        </div>
      )}
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
}

const AnnouncementPopupModal = (props: AnnouncementPopupModalProps) => {
  const { popup, assets, onDismiss } = props;
  const { themeSettings: resourceCenterThemeSettings, zIndex } = useResourceCenterContext();
  const { globalStyle } = useSettingsStyles(popup.themeSettings ?? resourceCenterThemeSettings);
  const width = popup.popupConfig.modalWidth ?? DEFAULT_POPUP_MODAL_WIDTH;

  return (
    <>
      <div
        className={WidgetClass.overlay}
        style={{ position: 'fixed', visibility: 'visible', zIndex: zIndex + 2 }}
        onClick={onDismiss}
      />
      <div
        className={`${WidgetClass.surface} ${WidgetClass.elevation}`}
        style={{ ...computePositionStyle('center', 0, 0), width: `${width}px`, zIndex: zIndex + 3 }}
      >
        <div className={WidgetClass.surfaceShell}>
          <div className={WidgetClass.surfaceFrame}>
            <Frame assets={assets} className={WidgetClass.surfaceViewport}>
              <PopupFrameContent globalStyle={globalStyle}>
                <AnnouncementPopupBody popup={popup} onDismiss={onDismiss} />
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

const BUBBLE_NOTCH_SIZE = 20;

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
  } = useResourceCenterContext();
  const { globalStyle, themeSetting } = useSettingsStyles(
    popup.themeSettings ?? resourceCenterThemeSettings,
  );

  const width = themeSetting?.bubble?.width ?? 300;

  // Sit above the launcher's corner: same horizontal offset as the resource
  // center anchor, lifted by the launcher's height plus the notch. The
  // launcher placement (not the announcement theme) decides the side, so the
  // bubble grows toward the viewport center.
  const resourceCenter = resourceCenterThemeSetting.resourceCenter;
  const placement = resourceCenter?.placement ?? RESOURCE_CENTER_DEFAULTS.placement;
  const alignLeft = String(placement).includes('left');
  const position = alignLeft ? 'leftBottom' : 'rightBottom';
  const launcherHeight = resourceCenterThemeSetting.resourceCenterLauncherButton?.height ?? 60;
  const positionOffsetX = resourceCenter?.offsetX ?? RESOURCE_CENTER_DEFAULTS.offsetX;
  const positionOffsetY =
    (resourceCenter?.offsetY ?? RESOURCE_CENTER_DEFAULTS.offsetY) +
    launcherHeight +
    BUBBLE_NOTCH_SIZE;

  const positionStyle = computePositionStyle(position, positionOffsetX, positionOffsetY);

  return (
    <div
      className={`${WidgetClass.surface} ${WidgetClass.elevation}`}
      style={{ ...positionStyle, width: `${width}px`, zIndex: zIndex + 1 }}
    >
      <div className={WidgetClass.surfaceShell}>
        <div className={WidgetClass.surfaceFrame}>
          <Frame assets={assets} className={WidgetClass.surfaceViewport}>
            <PopupFrameContent globalStyle={globalStyle}>
              <AnnouncementPopupBody popup={popup} onDismiss={onDismiss} onReadMore={onReadMore} />
            </PopupFrameContent>
          </Frame>
        </div>
      </div>
      {/* The tail pointing down at the launcher — negative offsetY pushes it
          just below the card edge. */}
      <PopperAvatarNotch
        vertical="bottom"
        horizontal={alignLeft ? 'left' : 'right'}
        color={themeSetting?.mainColor?.background}
        size={BUBBLE_NOTCH_SIZE}
        offsetX={16}
        offsetY={-BUBBLE_NOTCH_SIZE}
      />
    </div>
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
    const handleBubbleReadMore = useCallback(() => {
      if (!popupAnnouncement) {
        return;
      }
      for (const tab of data.tabs ?? []) {
        const block = tab.blocks.find((item) => item.type === ResourceCenterBlockType.ANNOUNCEMENT);
        if (block) {
          actions.switchTab(tab.id);
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
        />
      );
    }
    return (
      <AnnouncementPopupBubble
        popup={popupAnnouncement}
        assets={assets}
        onDismiss={handleDismiss}
        onReadMore={handleBubbleReadMore}
      />
    );
  },
);

ResourceCenterAnnouncementPopup.displayName = 'ResourceCenterAnnouncementPopup';
