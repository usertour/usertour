import { getAuthToken } from '@usertour/helpers';
import { getAuthToken as getAuthTokenInExtension } from '../utils/storage';

export const useToken = () => {
  const token = getAuthTokenInExtension() || getAuthToken();
  return { token };
};
