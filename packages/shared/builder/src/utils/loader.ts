import { buildGoogleFontUrl, shouldLoadGoogleFont } from '@usertour/helpers';

const loadStyleSheet = async (url: string, doc: Document) => {
  const sheet = doc.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = url;
  sheet.type = 'text/css';
  doc.head.appendChild(sheet);
  return new Promise((resolve: (isLoaded: boolean) => void) => {
    sheet.onload = () => {
      resolve(true);
    };

    sheet.onerror = () => {
      resolve(false);
    };
  }).then((isLoaded: boolean) => isLoaded);
};

export const loadGoogleFontCss = (fontFamily: string, doc: Document) => {
  if (shouldLoadGoogleFont(fontFamily)) {
    const url = buildGoogleFontUrl(fontFamily);
    return loadStyleSheet(url, doc);
  }
};
