import type { ContentEditorRoot } from './editor';
import type { ThemeTypesSetting } from './theme-settings';

// ============================================================================
// Enums
// ============================================================================

/**
 * Notification level — how loudly the user is notified about the announcement.
 * SILENT: feed only. BADGE: feed + unread badge on the launcher. POPUP: feed +
 * badge + actively presented once (modal or speech bubble, per popupConfig).
 */
export enum AnnouncementDistribution {
  SILENT = 'silent',
  BADGE = 'badge',
  POPUP = 'popup',
}

/** How a POPUP-level announcement presents itself. */
export enum AnnouncementPopupStyle {
  /** Centered modal with overlay. */
  MODAL = 'modal',
  /** Speech bubble anchored at the resource-center launcher. */
  BUBBLE = 'bubble',
}

// ============================================================================
// Popup Config
// ============================================================================

export interface AnnouncementPopupConfig {
  style: AnnouncementPopupStyle;
}

// ============================================================================
// Announcement Data (stored in ContentVersion.data)
// ============================================================================

export interface AnnouncementData {
  /** Title shown in list and detail. */
  title: string;
  /** Intro content — displayed in RC list row and the popup. */
  introContent: ContentEditorRoot[];
  /** Whether "Read more" detail page is enabled. */
  enableReadMore: boolean;
  /** Label for the "Read more" button (default: "Read more"). */
  readMoreLabel: string;
  /** Full content — displayed in detail page after clicking "Read more". */
  detailContent: ContentEditorRoot[];
  /** Notification level. */
  distribution: AnnouncementDistribution;
  /** Popup presentation config (only when distribution is POPUP). */
  popupConfig?: AnnouncementPopupConfig;
}

// ============================================================================
// Wire Contracts (websocket)
// ============================================================================

/**
 * List announcements response. The feed is a single server-capped page (the
 * newest N announcements) — there is no pagination on this contract; the
 * request carries no parameters.
 */
export type ListAnnouncementsResult = {
  announcements: AnnouncementListItem[];
  /**
   * Resolved user-attribute values (codeName → value) for the attributes
   * referenced across the returned announcements' content. The feed's content
   * isn't part of the resource-center session, so its attributes aren't in the
   * session's userAttributes; the widget merges these to interpolate them.
   */
  attributes?: Record<string, any>;
};

/**
 * Fields shared by a feed row and the detail view — the two read paths must
 * expose identical values for them.
 */
export type AnnouncementItemBase = {
  id: string;
  versionId: string;
  title: string;
  /** Intro content shown in the feed row (detail content is fetched on demand). */
  content: ContentEditorRoot[];
  moreEnabled: boolean;
  moreButtonText: string;
  level: AnnouncementDistribution;
  /** The announcement time (scheduledAt), ISO-8601. */
  time: string;
};

/**
 * Announcement item in the feed (excludes detail content to reduce payload).
 */
export type AnnouncementListItem = AnnouncementItemBase & {
  seen: boolean;
};

/**
 * Get single announcement request
 */
export type GetAnnouncementDto = {
  contentId: string;
};

/**
 * Get single announcement response (full content including detail). Carries no
 * `seen` — the feed is the only surface that renders it, and every detail open
 * goes through the feed.
 */
export type AnnouncementDetail = AnnouncementItemBase & {
  moreContent: ContentEditorRoot[] | null;
  /**
   * Resolved user-attribute values (codeName → value) for the attributes
   * referenced in this announcement's intro + detail content. See
   * ListAnnouncementsResult.attributes.
   */
  attributes?: Record<string, any>;
};

/**
 * Where an announcement was seen — recorded on the ANNOUNCEMENT_SEEN analytics
 * event. 'resource_center' is the feed; 'modal' / 'bubble' are the popup
 * presentations.
 */
export type AnnouncementSeenSource = 'resource_center' | 'modal' | 'bubble';

/**
 * Mark announcements as seen request — one batch per surface interaction: the
 * feed sends every announcement it displayed as unseen on open; a popup sends
 * its single announcement when the user interacts with it.
 */
export type MarkAnnouncementsSeenDto = {
  items: {
    contentId: string;
    /** The published version the user actually saw, for the analytics event. */
    versionId: string;
  }[];
  /** Which surface marked them (defaults to 'resource_center'). */
  source?: AnnouncementSeenSource;
};

/**
 * The newest unseen POPUP-level announcement, delivered with the
 * resource-center session so the widget can self-present it. Populated by the
 * server at session build time; carries everything the popup needs to render
 * without another round trip.
 */
export type PopupAnnouncement = AnnouncementDetail & {
  popupConfig: AnnouncementPopupConfig;
  /**
   * Theme settings resolved from the announcement version's themeId. Absent
   * when the theme can't be resolved — the widget then falls back to the
   * resource center's own theme.
   */
  themeSettings?: ThemeTypesSetting;
};
