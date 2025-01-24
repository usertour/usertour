import { Label } from "@usertour-ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@usertour-ui/select";
import { HelpTooltip } from "@usertour-ui/shared-components";

interface PrecisionSelectProps {
  value?: string;
  onChange: (value: string) => void;
  zIndex: number;
}

export const PrecisionSelect = ({
  value,
  onChange,
  zIndex,
}: PrecisionSelectProps) => {
  return (
    <div className="items-center space-y-2">
      <div className="flex justify-start items-center space-x-1">
        <Label>Precision</Label>
        <HelpTooltip>
          How flexible Usertour should be when looking for the element. If
        </HelpTooltip>
      </div>
      <Select onValueChange={onChange} defaultValue={value}>
        <SelectTrigger>
          <SelectValue placeholder="Select a precision" />
        </SelectTrigger>
        <SelectContent style={{ zIndex }}>
          <SelectGroup>
            <SelectItem value="loosest">Loosest</SelectItem>
            <SelectItem value="looser">Looser</SelectItem>
            <SelectItem value="loose">Loose</SelectItem>
            <SelectItem value="strict">Strict</SelectItem>
            <SelectItem value="stricter">Stricter</SelectItem>
            <SelectItem value="strictest">Strictest</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
