const hslToHex = (hsl: { h: number; s: number; l: number }): string => {
  const { h, s, l } = hsl;

  const hDecimal = l / 100;
  const a = (s * Math.min(hDecimal, 1 - hDecimal)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = hDecimal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

    // Convert to Hex and prefix with "0" if required
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// const hexToHSL = (hex: string): { h: number; s: number; l: number } => {
//   const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

//   if (!result) {
//     throw new Error("Could not parse Hex Color");
//   }

//   const rHex = parseInt(result[1], 16);
//   const gHex = parseInt(result[2], 16);
//   const bHex = parseInt(result[3], 16);

//   const r = rHex / 255;
//   const g = gHex / 255;
//   const b = bHex / 255;

//   const max = Math.max(r, g, b);
//   const min = Math.min(r, g, b);

//   let h = (max + min) / 2;
//   let s = h;
//   let l = h;

//   if (max === min) {
//     // Achromatic
//     return { h: 0, s: 0, l };
//   }

//   const d = max - min;
//   s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
//   switch (max) {
//     case r:
//       h = (g - b) / d + (g < b ? 6 : 0);
//       break;
//     case g:
//       h = (b - r) / d + 2;
//       break;
//     case b:
//       h = (r - g) / d + 4;
//       break;
//   }
//   h /= 6;

//   s = s * 100;
//   s = Math.round(s);
//   l = l * 100;
//   l = Math.round(l);
//   h = Math.round(360 * h);

//   return { h, s, l };
// };

export function hexToHSL(hex: string): [number, string, string] {
  // Remove the hash if it exists
  hex = hex.replace(/^#/, "");

  // Convert hex to RGB
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  // Convert to degrees and percentages
  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  return [hDeg, `${sPct}%`, `${lPct}%`];
}

export const changeColor = (color: string, amount: number) => {
  // #FFF not supportet rather use #FFFFFF
  const clamp = (val: number) => Math.min(Math.max(val, 0), 0xff);
  const fill = (str: string) => ("00" + str).slice(-2);

  const num = parseInt(color.substr(1), 16);
  const red = clamp((num >> 16) + amount);
  const green = clamp(((num >> 8) & 0x00ff) + amount);
  const blue = clamp((num & 0x0000ff) + amount);
  return (
    "#" +
    fill(red.toString(16)) +
    fill(green.toString(16)) +
    fill(blue.toString(16))
  );
};

export const newShade = (hexColor: string, magnitude: number) => {
  hexColor = hexColor.replace(`#`, ``);
  if (hexColor.length === 6) {
    const decimalColor = parseInt(hexColor, 16);
    let r = (decimalColor >> 16) + magnitude;
    r > 255 && (r = 255);
    r < 0 && (r = 0);
    let g = (decimalColor & 0x0000ff) + magnitude;
    g > 255 && (g = 255);
    g < 0 && (g = 0);
    let b = ((decimalColor >> 8) & 0x00ff) + magnitude;
    b > 255 && (b = 255);
    b < 0 && (b = 0);
    return `#${(g | (b << 8) | (r << 16)).toString(16)}`;
  } else {
    return hexColor;
  }
};

export const hexToRGBStr = (hex: string) => {
  let alpha = false,
    h = hex.slice(hex.startsWith("#") ? 1 : 0) as any;
  if (h.length === 3) h = [...h].map((x) => x + x).join("");
  else if (h.length === 8) alpha = true;
  h = parseInt(h, 16);
  return (
    (h >>> (alpha ? 24 : 16)) +
    ", " +
    ((h & (alpha ? 0x00ff0000 : 0x00ff00)) >>> (alpha ? 16 : 8)) +
    ", " +
    ((h & (alpha ? 0x0000ff00 : 0x0000ff)) >>> (alpha ? 8 : 0)) +
    (alpha ? `, ${h & 0x000000ff}` : "")
  );
};

export const hexToRGB = (hex: string) => {
  let alpha = false,
    h = hex.slice(hex.startsWith("#") ? 1 : 0) as any;
  if (h.length === 3) h = [...h].map((x) => x + x).join("");
  else if (h.length === 8) alpha = true;
  h = parseInt(h, 16);
  return (
    "rgb" +
    (alpha ? "a" : "") +
    "(" +
    (h >>> (alpha ? 24 : 16)) +
    ", " +
    ((h & (alpha ? 0x00ff0000 : 0x00ff00)) >>> (alpha ? 16 : 8)) +
    ", " +
    ((h & (alpha ? 0x0000ff00 : 0x0000ff)) >>> (alpha ? 8 : 0)) +
    (alpha ? `, ${h & 0x000000ff}` : "") +
    ")"
  );
};
