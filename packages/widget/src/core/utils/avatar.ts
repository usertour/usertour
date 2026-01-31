import { AvatarType, ThemeTypesSetting } from '@usertour/types';

/**
 * Get avatar URL from theme settings
 * Supports custom URL/upload avatars
 * Note: For CARTOON type, use avatarComponent from useSettingsStyles hook instead
 *
 * @param settings - Theme settings containing avatar configuration
 * @returns Avatar URL string (empty for CARTOON type, actual URL for URL/UPLOAD types)
 */
export const getAvatarUrlFromSettings = (settings?: ThemeTypesSetting): string => {
  const avatar = settings?.avatar;

  // Return empty string when not configured (will use default avatarComponent)
  if (!avatar) {
    return '';
  }

  switch (avatar.type) {
    case AvatarType.CARTOON:
      // CARTOON avatars use inline SVG components, no URL needed
      return '';
    case AvatarType.URL:
    case AvatarType.UPLOAD:
      return avatar.url ?? '';
    default:
      return '';
  }
};
