import { Text } from '@react-email/components';
import {
  emailColors,
  emailFontSize,
  emailFonts,
  emailRadius,
  fallbackUrlStyle,
} from '../common-style';

export interface CallToActionProps {
  href: string;
  label: string;
}

/**
 * The email's one action: a "bulletproof button" built as a table so the
 * padded, coloured shape survives clients that strip padding from links.
 * The URL is always spelled out beneath it for clients that block the button.
 */
export const CallToAction = (props: CallToActionProps) => {
  const { href, label } = props;

  return (
    <>
      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{ margin: '4px 0 20px' }}
      >
        <tbody>
          <tr>
            <td
              align="center"
              // Some desktop clients ignore CSS backgrounds on cells and need the
              // attribute; React's td typings don't know it, hence the spread.
              {...({ bgcolor: emailColors.primary } as Record<string, string>)}
              style={{
                backgroundColor: emailColors.primary,
                borderRadius: emailRadius.sm,
                padding: '12px 22px',
              }}
            >
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: emailColors.onPrimary,
                  display: 'inline-block',
                  fontFamily: emailFonts.sans,
                  fontSize: emailFontSize.md,
                  fontWeight: 700,
                  lineHeight: '20px',
                  textDecoration: 'none',
                }}
              >
                {label}
              </a>
            </td>
          </tr>
        </tbody>
      </table>
      <Text style={fallbackUrlStyle}>
        If the button does not work, copy this address into your browser: {href}
      </Text>
    </>
  );
};

export default CallToAction;
