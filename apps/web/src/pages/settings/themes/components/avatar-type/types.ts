import type { AvatarType } from '@usertour/types';

/**
 * Avatar type selection component props
 */
export interface AvatarTypeProps {
  /** Current avatar type */
  type: AvatarType;
  /** Selected avatar name (for cartoon type) */
  name?: string;
  /** Avatar URL (for upload/url types) */
  url?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Callback when avatar settings change */
  onChange: (updates: {
    type: AvatarType;
    name?: string;
    url?: string;
  }) => void;
}

/**
 * Cartoon avatar tab props
 */
export interface CartoonAvatarTabProps {
  selectedName?: string;
  onAvatarSelect: (name: string) => void;
}

/**
 * Upload avatar tab props
 */
export interface UploadAvatarTabProps {
  avatarUrl?: string;
  isCurrentUpload: boolean;
  onUploadSuccess: (url: string) => void;
  onRemove?: () => void;
}

/**
 * URL avatar tab props
 */
export interface UrlAvatarTabProps {
  avatarUrl?: string;
  isCurrentUrl: boolean;
  onUrlSubmit: (url: string) => void;
}
