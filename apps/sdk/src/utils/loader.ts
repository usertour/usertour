export const loadCSSResource = async (
  url: string,
  doc: Document
): Promise<boolean> => {
  const sheet = doc.createElement("link");
  sheet.rel = "stylesheet";
  sheet.href = url;
  sheet.type = "text/css";
  doc.head.appendChild(sheet);

  return new Promise((resolve) => {
    // Add single event listener for load
    sheet.onload = () => resolve(true);
    // Add error handler
    sheet.onerror = () => resolve(false);
  });
};
