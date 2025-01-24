import { loadStyleSheet } from "@usertour-ui/ui-utils";

export const loadGoogleFontCss = (fontFamily: string, doc: Document) => {
  if (
    fontFamily &&
    fontFamily != "System font" &&
    fontFamily != "Custom font"
  ) {
    const url = `https://fonts.googleapis.com/css2?family=${fontFamily}`;
    return loadStyleSheet(url, doc);
  }
};
