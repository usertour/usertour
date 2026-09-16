import { Text } from '@react-email/components';
import {
  emailColors,
  panelCellStyle,
  panelLabelStyle,
  panelMonoValueStyle,
  panelStyle,
} from '../common-style';

export interface MonoBlockProps {
  /** Short caption, e.g. "Endpoint". */
  label: string;
  value: string;
}

/**
 * One value the reader will check against, set apart from the prose: a grey
 * panel with a small caption and the value in monospace, breaking anywhere so
 * a long URL never pushes the card wider than the viewport.
 */
export const MonoBlock = (props: MonoBlockProps) => {
  const { label, value } = props;

  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      width="100%"
      style={panelStyle}
    >
      <tbody>
        <tr>
          <td
            {...({ bgcolor: emailColors.panel } as Record<string, string>)}
            style={panelCellStyle}
          >
            <Text style={panelLabelStyle}>{label}</Text>
            <Text style={panelMonoValueStyle}>{value}</Text>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default MonoBlock;
