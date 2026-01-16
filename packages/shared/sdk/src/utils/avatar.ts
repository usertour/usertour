import { getAvatarCdnUrl, getAvatarLocalPath } from '@usertour-packages/icons';
import { AvatarType, ThemeTypesSetting } from '@usertour/types';

const DEFAULT_AVATAR_NAME = 'alex';

/**
 * Get avatar URL from theme settings
 * Supports cartoon avatars (via CDN or local path) and custom URL/upload avatars
 *
 * @param settings - Theme settings containing avatar configuration
 * @param useLocalPath - If true, use local path for cartoon avatars (for web admin),
 *                       otherwise use CDN URL (for SDK runtime)
 * @returns Avatar URL string
 */
export const getAvatarUrlFromSettings = (
  settings?: ThemeTypesSetting,
  useLocalPath = false,
): string => {
  const avatar = settings?.avatar;
  const getPath = useLocalPath ? getAvatarLocalPath : getAvatarCdnUrl;

  // Return default avatar when not configured
  if (!avatar) {
    return getPath(DEFAULT_AVATAR_NAME);
  }

  switch (avatar.type) {
    case AvatarType.CARTOON:
      return getPath(avatar.name ?? DEFAULT_AVATAR_NAME);
    case AvatarType.URL:
    case AvatarType.UPLOAD:
      return avatar.url ?? getPath(DEFAULT_AVATAR_NAME);
    default:
      return getPath(DEFAULT_AVATAR_NAME);
  }
};
