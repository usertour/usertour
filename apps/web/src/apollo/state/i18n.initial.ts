import { makeVar } from "@apollo/client";

export type Language = "ko" | "en";

type i18nModel = {
    __typename: string;
    lng: Language;
};

export const initialI18n = makeVar<i18nModel>({
    lng: "ko",
    __typename: "language",
});
