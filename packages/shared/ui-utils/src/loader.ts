export const loadStyleSheet = async (url: string, doc: Document) => {
  const sheet = doc.createElement("link");
  sheet.rel = "stylesheet";
  sheet.href = url;
  sheet.type = "text/css";
  doc.head.appendChild(sheet);
  return new Promise(function (resolve: (isLoaded: boolean) => void) {
    sheet.onload = () => resolve(true);
    sheet.addEventListener("load", () => resolve(true));
    sheet.onload = () => {
      resolve(true);
    };

    sheet.onerror = () => {
      resolve(false);
    };
  }).then(function (isLoaded: boolean) {
    return isLoaded;
  });
};
