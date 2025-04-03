import { Switch } from '@usertour-ui/switch';
import { Label } from '@usertour-ui/label';
import { QuestionTooltip } from '@usertour-ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@usertour-ui/select';
import { AttributeBizTypes, BizAttributeTypes } from '@usertour-ui/types';

interface BindAttributeProps {
  bindToAttribute: boolean;
  selectedAttribute?: string;
  zIndex: number;
  attributes: any[]; // Replace 'any' with your actual attribute type
  onBindChange: (checked: boolean) => void;
  onAttributeChange: (value: string) => void;
  dataType?: BizAttributeTypes; // Optional parameter for different input types
}

export const BindAttribute = ({
  bindToAttribute,
  selectedAttribute,
  zIndex,
  attributes,
  onBindChange,
  onAttributeChange,
  dataType = BizAttributeTypes.Number, // Default to Number for NPS
}: BindAttributeProps) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1">
          Bind to user attribute
          <QuestionTooltip>Store the response in a user attribute</QuestionTooltip>
        </Label>
        <Switch
          className="data-[state=unchecked]:bg-muted"
          checked={bindToAttribute}
          onCheckedChange={onBindChange}
        />
      </div>

      {bindToAttribute && (
        <Select value={selectedAttribute} onValueChange={onAttributeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select user attribute" />
          </SelectTrigger>
          <SelectContent style={{ zIndex }}>
            {attributes
              ?.filter(
                (attr) =>
                  attr.bizType === AttributeBizTypes.User &&
                  !attr.predefined &&
                  attr.dataType === dataType,
              )
              .map((attr) => (
                <SelectItem key={attr.id} value={attr.id}>
                  {attr.displayName}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
