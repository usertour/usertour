import { UID_COOKIE } from '@usertour-packages/constants';
import { useCookie } from 'react-use';

/**
 * Hook to get the current user's ID from cookie
 * @returns The current user's ID or null if not logged in
 */
export const useCurrentUserId = (): string | null => {
  const [uid] = useCookie(UID_COOKIE);
  return uid;
};
