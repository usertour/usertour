import { getAuthToken } from '@usertour/helpers';

export const useToken = () => {
  const token = getAuthToken();
  return { token };
};
