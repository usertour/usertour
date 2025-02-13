import { Label } from '@usertour-ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-ui/select';
import { HelpTooltip } from '@usertour-ui/shared-components';

interface SequenceSelectProps {
  value?: string;
  onChange: (value: string) => void;
  zIndex: number;
}

export const SequenceSelect = ({ value = '1st', onChange, zIndex }: SequenceSelectProps) => {
  const options = [1, 2, 3, 4, 5].map((num) => ({
    value: `${num}st`,
    label: `select ${num}st element`,
  }));

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-start items-center space-x-1	">
        <Label>If multiple matches</Label>
        <HelpTooltip>
          If multiple elements match your criteria, you can tell Usertour which of the elements to
          select.
          <br />
          Elements are sorted first by vertical position and second by horizontal position. l.e. an
          element higher up on the page and more towards the left takes precedence.{' '}
        </HelpTooltip>
      </div>
      <Select onValueChange={onChange} defaultValue={value}>
        <SelectTrigger>
          <SelectValue placeholder="Select a sequence" />
        </SelectTrigger>
        <SelectContent style={{ zIndex }}>
          <SelectGroup>
            {options.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                <div className="flex">{label}</div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
