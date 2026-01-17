export const extendSdk = {
  colors: {
    sdk: {
      border: 'var(--usertour-border)',
      input: 'var(--usertour-input)',
      ring: 'hsl(var(--usertour-focus-color))', // Format: "h s% l% / opacity"
      link: 'hsl(var(--usertour-link-color))',
      xbutton: 'var(--usertour-xbutton)',
      background: 'hsl(var(--usertour-background))',
      foreground: 'hsl(var(--usertour-foreground))',
      hover: 'hsl(var(--usertour-main-hover-background-color))',
      active: 'hsl(var(--usertour-main-active-background-color))',
      progress: 'var(--usertour-progress-bar-color)',
      question: 'hsl(var(--usertour-question-color))',
      brand: {
        hover: 'hsl(var(--usertour-brand-hover-background-color))',
        active: 'hsl(var(--usertour-brand-active-background-color))',
      },
      checklist: {
        'trigger-background': 'var(--usertour-checklist-trigger-background-color)',
        'trigger-active-background': 'var(--usertour-checklist-trigger-active-background-color)',
        'trigger-counter-background': 'var(--usertour-checklist-trigger-counter-background-color)',
        'trigger-counter-font': 'var(--usertour-checklist-trigger-counter-font-color)',
        'trigger-font': 'hsl(var(--usertour-checklist-trigger-font-color))',
        'trigger-hover-background': 'var(--usertour-checklist-trigger-hover-background-color)',
        checkmark: 'var(--usertour-checkmark-background-color)',
      },
      // Button colors (border colors are in borderColor extension)
      btn: {
        primary: {
          DEFAULT: 'var(--usertour-primary)',
          hover: 'var(--usertour-primary-hover)',
          active: 'var(--usertour-primary-active)',
          foreground: 'var(--usertour-primary-foreground)',
          'foreground-hover': 'var(--usertour-primary-foreground-hover)',
          'foreground-active': 'var(--usertour-primary-foreground-active)',
        },
        secondary: {
          DEFAULT: 'var(--usertour-secondary)',
          hover: 'var(--usertour-secondary-hover)',
          active: 'var(--usertour-secondary-active)',
          foreground: 'var(--usertour-secondary-foreground)',
          'foreground-hover': 'var(--usertour-secondary-foreground-hover)',
          'foreground-active': 'var(--usertour-secondary-foreground-active)',
        },
      },
    },
  },
  fontFamily: {
    sdk: 'var(--usertour-font-family)',
  },
  borderRadius: {
    'sdk-checklist-trigger': 'var(--usertour-checklist-trigger-border-radius)',
    'sdk-lg': 'var(--usertour-radius)',
    'sdk-md': 'calc(var(--usertour-radius) - 2px)',
    'sdk-sm': 'calc(var(--usertour-radius) - 4px)',
    'sdk-popper': 'var(--usertour-popper-radius)',
    'sdk-button': 'var(--usertour-button-border-radius)',
  },
  borderWidth: {
    'sdk-btn-primary': 'var(--usertour-primary-border-width)',
    'sdk-btn-secondary': 'var(--usertour-secondary-border-width)',
  },
  // Use same key as borderWidth so single class sets both width and color
  borderColor: {
    'sdk-btn-primary': {
      DEFAULT: 'var(--usertour-primary-border-color)',
      hover: 'var(--usertour-primary-border-hover)',
      active: 'var(--usertour-primary-border-active)',
    },
    'sdk-btn-secondary': {
      DEFAULT: 'var(--usertour-secondary-border-color)',
      hover: 'var(--usertour-secondary-border-hover)',
      active: 'var(--usertour-secondary-border-active)',
    },
  },
  padding: {
    'sdk-button-x': 'var(--usertour-button-px)',
  },
  height: {
    'sdk-line-height': 'var(--usertour-line-height)',
    'sdk-button': 'var(--usertour-button-height)',
    'sdk-progress': 'var(--usertour-progress-bar-height)',
    'sdk-narrow-progress': 'var(--usertour-narrow-progress-bar-height)',
    'sdk-squared-progress': 'var(--usertour-squared-progress-bar-height)',
    'sdk-rounded-progress': 'var(--usertour-rounded-progress-bar-height)',
    'sdk-dotted-progress': 'var(--usertour-dotted-progress-bar-height)',
  },
  width: {
    'sdk-rounded-progress': 'calc(var(--usertour-rounded-progress-bar-height) * 2)',
    'sdk-squared-progress': 'calc(var(--usertour-squared-progress-bar-height) * 3)',
    'sdk-dotted-progress': 'var(--usertour-dotted-progress-bar-height)',
  },
  minWidth: {
    'sdk-button': 'var(--usertour-button-min-width)',
  },
  lineHeight: {
    'sdk-base': 'var(--usertour-line-height)',
  },
  fontSize: {
    'sdk-base': 'var(--usertour-font-size)',
    'sdk-h1': 'var(--usertour-font-size-h1)',
    'sdk-h2': 'var(--usertour-font-size-h2)',
    'sdk-xs': 'calc(var(--usertour-font-size) * 0.75)',
    'sdk-sm': 'calc(var(--usertour-font-size) * 0.875)',
    'sdk-numbered-progress': 'var(--usertour-numbered-progress-bar-height)',
  },
  fontWeight: {
    'sdk-normal': 'var(--usertour-font-weight)',
    'sdk-bold': 'var(--usertour-font-weight-bold)',
    'sdk-primary': 'var(--usertour-font-weight-primary)',
    'sdk-secondary': 'var(--usertour-font-weight-secondary)',
    'sdk-checklist-trigger': 'var(--usertour-checklist-trigger-font-weight)',
  },
  keyframes: {
    'accordion-down': {
      from: { height: 0 },
      to: { height: 'var(--radix-accordion-content-height)' },
    },
    'accordion-up': {
      from: { height: 'var(--radix-accordion-content-height)' },
      to: { height: 0 },
    },
    'pop-scale': {
      '0%': { transform: 'scale(1)' },
      '33%': { transform: 'scale(0.75)' },
      '67%': { transform: 'scale(1.25)' },
      '100%': { transform: 'scale(1)' },
    },
  },
  animation: {
    'accordion-down': 'accordion-down 0.2s ease-out',
    'accordion-up': 'accordion-up 0.2s ease-out',
    'pop-scale': 'pop-scale 500ms ease-out',
  },
};

export const extendBase = {
  screens: {
    '3xl': '2400px',
  },
  minWidth: {
    '2xl': '42rem', // 672px
  },
  colors: {
    border: 'hsl(var(--border))',
    input: 'hsl(var(--input))',
    ring: 'hsl(var(--ring))',
    background: 'hsl(var(--background))',
    foreground: 'hsl(var(--foreground))',
    'background-400': 'hsl(var(--background-400))',
    'background-700': 'hsl(var(--background-700))',
    'background-800': 'hsl(var(--background-800))',
    'background-900': 'hsl(var(--background-900))',
    success: 'hsl(var(--success))',
    warning: 'hsl(var(--warning))',
    'warning-foreground': 'hsl(var(--warning-foreground))',
    primary: {
      DEFAULT: 'hsl(var(--primary))',
      foreground: 'hsl(var(--primary-foreground))',
      hover: 'hsl(var(--primary-hover))',
    },
    editor: {
      DEFAULT: 'hsl(var(--editor))',
      foreground: 'hsl(var(--editor-foreground))',
      hover: 'hsl(var(--editor-hover))',
      toolbar: 'hsl(var(--editor-toolbar))',
      border: 'hsl(var(--editor-border))',
    },
    secondary: {
      DEFAULT: 'hsl(var(--secondary))',
      foreground: 'hsl(var(--secondary-foreground))',
      hover: 'hsl(var(--secondary-hover))',
    },
    destructive: {
      DEFAULT: 'hsl(var(--destructive))',
      foreground: 'hsl(var(--destructive-foreground))',
      hover: 'hsl(var(--destructive-hover))',
    },
    muted: {
      DEFAULT: 'hsl(var(--muted))',
      foreground: 'hsl(var(--muted-foreground))',
    },
    accent: {
      DEFAULT: 'hsl(var(--accent))',
      foreground: 'hsl(var(--accent-foreground))',
      hover: 'hsl(var(--accent-hover))',
    },
    popover: {
      DEFAULT: 'hsl(var(--popover))',
      foreground: 'hsl(var(--popover-foreground))',
    },
    card: {
      DEFAULT: 'hsl(var(--card))',
      foreground: 'hsl(var(--card-foreground))',
    },
    chart: {
      1: 'hsl(var(--chart-1))',
      2: 'hsl(var(--chart-2))',
      3: 'hsl(var(--chart-3))',
      4: 'hsl(var(--chart-4))',
      5: 'hsl(var(--chart-5))',
    },
  },
  borderRadius: {
    lg: 'var(--radius)',
    md: 'calc(var(--radius) - 2px)',
    sm: 'calc(var(--radius) - 4px)',
  },
  // fontFamily: {
  //   sans: ["var(--font-sans)", ...fontFamily.sans],
  // },
  keyframes: {
    'accordion-down': {
      from: { height: 0 },
      to: { height: 'var(--radix-accordion-content-height)' },
    },
    'accordion-up': {
      from: { height: 'var(--radix-accordion-content-height)' },
      to: { height: 0 },
    },
  },
  animation: {
    'accordion-down': 'accordion-down 0.2s ease-out',
    'accordion-up': 'accordion-up 0.2s ease-out',
  },
};

export const mergeExtend = (config: any, dst: any) => {
  for (const key in config) {
    if (dst[key]) {
      if (!config[key]) {
        config[key] = {};
      }
      config[key] = Object.assign(config[key], dst[key]);
    }
  }
  return config;
};
