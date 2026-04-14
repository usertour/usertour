import type { ContentEditorRoot } from './editor';

// ============================================================================
// Enums
// ============================================================================

export enum AnnouncementDistribution {
  SILENT = 'silent',
  BADGE = 'badge',
  BOOSTED = 'boosted',
}

export enum AnnouncementBoostedType {
  POPOUT = 'popout',
  MODAL = 'modal',
  TOAST = 'toast',
}

// ============================================================================
// Boosted Config
// ============================================================================

export interface AnnouncementBoostedConfig {
  type: AnnouncementBoostedType;
  /** Only for MODAL type (default: 480). */
  modalWidth?: number;
  /** Only for TOAST type (default: 360). */
  toastWidth?: number;
  /** Toast auto-dismiss duration in seconds (null = no auto-dismiss). */
  toastAutoDismiss?: number | null;
}

// ============================================================================
// Announcement Data (stored in ContentVersion.data)
// ============================================================================

export interface AnnouncementData {
  /** Title shown in list and detail. */
  title: string;
  /** Intro content — displayed in RC list row and Boosted popup. */
  introContent: ContentEditorRoot[];
  /** Whether "Read more" detail page is enabled. */
  enableReadMore: boolean;
  /** Label for the "Read more" button (default: "Read more"). */
  readMoreLabel: string;
  /** Full content — displayed in detail page after clicking "Read more". */
  detailContent: ContentEditorRoot[];
  /** Notification level. */
  distribution: AnnouncementDistribution;
  /** Boosted config (only when distribution is BOOSTED). */
  boostedConfig?: AnnouncementBoostedConfig;
}

export const DEFAULT_ANNOUNCEMENT_DATA: AnnouncementData = {
  title: '',
  introContent: [],
  enableReadMore: false,
  readMoreLabel: 'Read more',
  detailContent: [],
  distribution: AnnouncementDistribution.SILENT,
};
