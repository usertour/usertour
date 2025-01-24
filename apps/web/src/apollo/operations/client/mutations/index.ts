import { Language } from "@/apollo/state";

import { updateLanguage } from "./i18n";
import { updateLocalUser } from "./user";

export const i18nMutations = {
  updateLanguage: async (lang: Language) => updateLanguage(lang),
};
export const localUserMutations = {
  updateLocalUser: async (isLoggedIn: boolean) => updateLocalUser(isLoggedIn),
};
