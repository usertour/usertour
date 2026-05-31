const parseCssPropertyToFloat = (str: string) => {
  return str ? Number.parseFloat(str.replace(/px$/, '')) : 0;
};

const getBodyZoom = () => {
  const styles: any = window.getComputedStyle(window.document.body);
  if (styles.zoom && '1' !== styles.zoom) {
    const z = Number.parseFloat(styles.zoom);
    if (!Number.isNaN(z)) {
      return z;
    }
  }
  return 1;
};

export const computeNodeInset = (node: HTMLElement) => {
  //const { innerWidth: w, innerHeight: h } = window;
  const { width, height, x, y } = node.getBoundingClientRect();
  const w =
    ('BackCompat' === document.compatMode ? document.body : document.documentElement).clientWidth ||
    window.innerWidth;
  const h =
    ('BackCompat' === document.compatMode ? document.body : document.documentElement)
      .clientHeight || window.innerHeight;
  const targetStyle = window.getComputedStyle(node);

  //支持目标网页缩放时的选择框计算
  const z = getBodyZoom();

  const borderRadius = {
    borderTopLeftRadius: Math.max(0, parseCssPropertyToFloat(targetStyle.borderTopLeftRadius)),
    borderTopRightRadius: Math.max(0, parseCssPropertyToFloat(targetStyle.borderTopRightRadius)),
    borderBottomRightRadius: Math.max(
      0,
      parseCssPropertyToFloat(targetStyle.borderBottomRightRadius),
    ),
    borderBottomLeftRadius: Math.max(
      0,
      parseCssPropertyToFloat(targetStyle.borderBottomLeftRadius),
    ),
  };

  const inset_top = y;
  const inset_right = (w - x * z - width * z) / z;
  const inset_bottom = (h - y * z - height * z) / z;
  const inset_left = x;

  return {
    css1: {
      inset: `${inset_top}px ${inset_right}px ${inset_bottom}px ${inset_left}px`,
      ...borderRadius,
    },
    css2: {
      inset: `${inset_top + height / 2}px ${inset_right + width / 2}px ${
        inset_bottom + height / 2
      }px ${inset_left + width / 2}px`,
    },
  };
};
