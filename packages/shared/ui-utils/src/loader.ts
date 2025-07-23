export const loadStyleSheet = async (url: string, doc: Document) => {
  const sheet = doc.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = url;
  sheet.type = 'text/css';
  doc.head.appendChild(sheet);
  return new Promise((resolve: (isLoaded: boolean) => void) => {
    sheet.onload = () => resolve(true);
    sheet.addEventListener('load', () => resolve(true));
    sheet.onload = () => {
      resolve(true);
    };

    sheet.onerror = () => {
      resolve(false);
    };
  }).then((isLoaded: boolean) => isLoaded);
};

export const loadGoogleFontCss = (fontFamily: string, doc: Document) => {
  if (fontFamily && fontFamily !== 'System font' && fontFamily !== 'Custom font') {
    const url = `https://fonts.googleapis.com/css2?family=${fontFamily}`;
    return loadStyleSheet(url, doc);
  }
};
