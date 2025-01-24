import { getAuthToken as getAuthTokenInExtension } from "../utils/storage";
import { getAuthToken as getAuthToken } from "@usertour-ui/shared-utils";

export const useToken = () => {
  const token = getAuthTokenInExtension() || getAuthToken();
  return { token };
};
