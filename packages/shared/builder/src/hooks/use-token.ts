import { getAuthToken } from '@usertour-packages/utils';
import { getAuthToken as getAuthTokenInExtension } from '../utils/storage';

export const useToken = () => {
  const token = getAuthTokenInExtension() || getAuthToken();
  return { token };
};
