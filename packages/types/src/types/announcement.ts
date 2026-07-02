import type { ContentEditorRoot } from './editor';

// ============================================================================
// Enums
// ============================================================================

export enum AnnouncementDistribution {
  SILENT = 'silent',
  BADGE = 'badge',
}

// ============================================================================
// Announcement Data (stored in ContentVersion.data)
// ============================================================================

export interface AnnouncementData {
  /** Title shown in list and detail. */
  title: string;
  /** Intro content — displayed in RC list row. */
  introContent: ContentEditorRoot[];
  /** Whether "Read more" detail page is enabled. */
  enableReadMore: boolean;
  /** Label for the "Read more" button (default: "Read more"). */
  readMoreLabel: string;
  /** Full content — displayed in detail page after clicking "Read more". */
  detailContent: ContentEditorRoot[];
  /** Notification level. */
  distribution: AnnouncementDistribution;
}
