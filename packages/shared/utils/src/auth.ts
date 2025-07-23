import { AppStorage } from './storage';

export const storage = new AppStorage('USERTOUR@0.0.1', 5);

const TOKEN_NAME = 'token';

export const getAuthToken = () => {
  return storage.getLocalStorage(TOKEN_NAME) as string;
};

export const removeAuthToken = () => {
  return storage.removeLocalStorage(TOKEN_NAME);
};

export const setAuthToken = (token: string, expire: number) => {
  storage.setLocalStorage(TOKEN_NAME, token, expire);
};
