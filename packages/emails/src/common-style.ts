import type { CSSProperties } from 'react';

/**
 * Shared design tokens for every Usertour email: a white card on a cool grey
 * page, the brand violet for the wordmark and the one button, and a quiet
 * grey panel for the value a reader will check against (an endpoint URL, a
 * provider name).
 *
 * Templates and components reference these constants instead of inlining
 * literal colors / sizes, so every message reads as the same brand.
 */
export const emailColors = {
  /** Usertour brand violet, hsl(250 100% 60%). */
  primary: '#5533FF',
  /** Text placed on top of `primary` (button labels). */
  onPrimary: '#ffffff',
  /** The page behind the card. */
  page: '#f6f9fc',
  /** The card. */
  card: '#ffffff',
  /** Quiet fills inside the card. */
  panel: '#f6f9fc',
  text: '#1a1f36',
  mutedText: '#697386',
  /** Small uppercase captions above a panel value. */
  label: '#8792a2',
  border: '#e6ebf1',
} as const;

export const emailFonts = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
} as const;

export const emailFontSize = {
  xs: '12px',
  sm: '13px',
  md: '15px',
  lg: '18px',
  xl: '24px',
} as const;

export const emailRadius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
} as const;

export const emailContainerWidth = '600px';

/**
 * Explicit background + text colors are set on every block so the templates
 * read the same way in light and dark email clients instead of inheriting
 * whatever the client decides to paint.
 */
export const bodyStyle: CSSProperties = {
  backgroundColor: emailColors.page,
  color: emailColors.text,
  fontFamily: emailFonts.sans,
  margin: 0,
  padding: '40px 12px',
};

export const cardStyle: CSSProperties = {
  backgroundColor: emailColors.card,
  borderRadius: emailRadius.lg,
  margin: '0 auto',
  maxWidth: emailContainerWidth,
  padding: '40px 44px',
  width: '100%',
};

export const logoSectionStyle: CSSProperties = {
  margin: '0 0 32px',
};

/** Fallback when no logo image is configured: the name in the brand colour. */
export const wordmarkStyle: CSSProperties = {
  color: emailColors.primary,
  fontFamily: emailFonts.sans,
  fontSize: '22px',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  lineHeight: '28px',
  margin: 0,
};

export const headingStyle: CSSProperties = {
  color: emailColors.text,
  fontFamily: emailFonts.sans,
  fontSize: emailFontSize.xl,
  fontWeight: 700,
  lineHeight: '32px',
  margin: '0 0 20px',
};

export const paragraphStyle: CSSProperties = {
  color: emailColors.text,
  fontFamily: emailFonts.sans,
  fontSize: emailFontSize.md,
  lineHeight: '24px',
  margin: '0 0 16px',
};

export const mutedParagraphStyle: CSSProperties = {
  ...paragraphStyle,
  color: emailColors.mutedText,
  fontSize: emailFontSize.sm,
  lineHeight: '20px',
};

export const signOffStyle: CSSProperties = {
  ...paragraphStyle,
  margin: '24px 0 0',
};

export const linkStyle: CSSProperties = {
  color: emailColors.primary,
  fontWeight: 600,
  textDecoration: 'none',
};

/** The URL spelled out under a button, for clients that block the button. */
export const fallbackUrlStyle: CSSProperties = {
  color: emailColors.mutedText,
  fontFamily: emailFonts.sans,
  fontSize: emailFontSize.xs,
  lineHeight: '18px',
  margin: '0 0 16px',
  wordBreak: 'break-all',
  overflowWrap: 'break-word',
};

/** A single value the reader will check against: grey panel, caption, mono. */
export const panelStyle: CSSProperties = {
  backgroundColor: emailColors.panel,
  borderRadius: emailRadius.md,
  margin: '0 0 24px',
  width: '100%',
};

export const panelLabelStyle: CSSProperties = {
  color: emailColors.label,
  fontFamily: emailFonts.sans,
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  lineHeight: '16px',
  margin: '0 0 4px',
  textTransform: 'uppercase',
};

export const panelMonoValueStyle: CSSProperties = {
  color: emailColors.text,
  fontFamily: emailFonts.mono,
  fontSize: emailFontSize.sm,
  lineHeight: '20px',
  margin: 0,
  wordBreak: 'break-all',
  overflowWrap: 'break-word',
};

export const footerStyle: CSSProperties = {
  margin: '0 auto',
  maxWidth: emailContainerWidth,
  padding: '24px 44px 0',
  width: '100%',
};

export const footerTextStyle: CSSProperties = {
  color: emailColors.mutedText,
  fontFamily: emailFonts.sans,
  fontSize: emailFontSize.xs,
  lineHeight: '18px',
  margin: '0 0 6px',
};
