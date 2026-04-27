/**
 * Accepted file types for avatar upload
 */
export const ACCEPT_FILE_TYPES = 'image/svg+xml,image/png,image/jpeg,image/gif,image/webp';

/**
 * Local base path for avatar images (used in web admin to avoid bundling large files)
 */
export const LOCAL_AVATAR_PATH = '/images/avatar';

/**
 * Avatar data for cartoon avatars using local static files
 */
export const LOCAL_AVATARS = [
  { name: 'alex', text: 'Alex' },
  { name: 'bella', text: 'Bella' },
  { name: 'chris', text: 'Chris' },
  { name: 'daniel', text: 'Daniel' },
  { name: 'emma', text: 'Emma' },
  { name: 'frank', text: 'Frank' },
  { name: 'grace', text: 'Grace' },
  { name: 'henry', text: 'Henry' },
] as const;

/**
 * Get local avatar URL by name
 * @param name - The avatar name
 * @returns The local path for the avatar
 */
export const getLocalAvatarUrl = (name: string): string => {
  return `${LOCAL_AVATAR_PATH}/${name}.svg`;
};
