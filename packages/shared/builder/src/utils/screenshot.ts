import { sendToBackground } from '@plasmohq/messaging';
import { TargetResult, parserV2 } from '@usertour-packages/finder';

export interface SelectorOutput {
  screenshot: {
    full: string;
    mini: string;
  };
  rect: DOMRect;
  target: TargetResult;
}

export const createScreenshot = async ({
  x,
  y,
  width,
  height,
  fullDataUrl,
}: any): Promise<string> => {
  return new Promise((resolve) => {
    const ratio = devicePixelRatio || window.devicePixelRatio;
    // Create canvas of desired size
    const canvas = document.createElement('canvas');
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    // Fill it with a black bg
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Load full image
    const fullImage = new Image();
    fullImage.onload = () => {
      ctx.drawImage(
        // Source image (screenshot)
        fullImage,
        // Source image (x, y) coordinates
        x * ratio,
        y * ratio,
        // Source image width x height
        width * ratio,
        height * ratio,
        // Destination (x, y) coordinates
        0,
        0,
        // Destination width x height
        width * ratio,
        height * ratio,
      );
      // All done!
      resolve(canvas.toDataURL());
    };
    fullImage.src = fullDataUrl;
  });
};

export const getImgSize = async (
  fullDataUrl: string,
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const fullImage = new Image();
    fullImage.onload = () => {
      resolve({ width: fullImage.width, height: fullImage.height });
    };
    fullImage.src = fullDataUrl;
  });
};

export const createMiniScreenshot = async (node: Element, dataUrl: string) => {
  const rect = node.getBoundingClientRect();
  const h = 130;
  const w = 242;
  const params = {
    width: rect.width,
    height: rect.height,
    x: rect.x,
    y: rect.y,
    fullDataUrl: dataUrl,
  };
  const fullRect = await getImgSize(dataUrl);

  if (params.height < h && params.width < w) {
    const rh = (h - params.height) / 2;
    params.height = h;
    params.y = params.y - rh;
    const wh = (w - params.width) / 2;
    params.width = w;
    params.x = params.x - wh;
  } else if ((params.height > h && params.width < w) || params.width / params.height < w / h) {
    const w1 = Math.min(rect.height * (w / h), fullRect.width - params.x);
    const rw = (w1 - params.width) / 2;
    params.width = w1;
    params.x = params.x - rw;
  } else if ((params.height < h && params.width > w) || params.width / params.height > w / h) {
    const h1 = Math.min(rect.width * (h / w), fullRect.height - params.y);
    const rh = (h1 - params.height) / 2;
    params.height = h1;
    params.y = params.y - rh;
  }
  params.x = Math.max(params.x, 0);
  params.y = Math.max(params.y, 0);
  params.height = Math.min(params.height, fullRect.height - params.y);
  params.width = Math.min(params.width, fullRect.width - params.x);
  return await createScreenshot(params);
};

export const createSelectorOutput = async (node: HTMLElement) => {
  if (!node) {
    return null;
  }
  try {
    const { dataUrl } = await sendToBackground({
      name: 'screenshot',
      body: {},
    } as any);
    const miniUrl = await createMiniScreenshot(node, dataUrl);
    const output: SelectorOutput = {
      screenshot: { full: dataUrl, mini: miniUrl },
      rect: node.getBoundingClientRect(),
      target: parserV2(node),
    };
    return output;
  } catch (error) {
    console.error(error);
    return null;
  }
};
