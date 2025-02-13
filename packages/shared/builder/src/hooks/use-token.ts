import { getAuthToken } from '@usertour-ui/shared-utils';
import { getAuthToken as getAuthTokenInExtension } from '../utils/storage';

export const useToken = () => {
  const token = getAuthTokenInExtension() || getAuthToken();
  return { token };
};
