import { Switch } from '@usertour-ui/switch';
import { Label } from '@usertour-ui/label';
import { QuestionTooltip } from '@usertour-ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@usertour-ui/select';
import { Attribute, AttributeBizTypes, BizAttributeTypes } from '@usertour-ui/types';
import { AttributeCreateForm } from '../../form/attribute-create-form';
import { useCallback, useState } from 'react';
import { useListAttributesQuery } from '@usertour-ui/shared-hooks';

interface BindAttributeProps {
  bindToAttribute: boolean;
  selectedAttribute?: string;
  zIndex: number;
  onBindChange: (checked: boolean) => void;
  onAttributeChange: (value: string) => void;
  dataType?: BizAttributeTypes; // Optional parameter for different input types
  projectId: string;
}

export const BindAttribute = ({
  bindToAttribute,
  selectedAttribute,
  zIndex,
  onBindChange,
  onAttributeChange,
  dataType = BizAttributeTypes.Number, // Default to Number for NPS
  projectId,
}: BindAttributeProps) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { attributes, refetch } = useListAttributesQuery(projectId, AttributeBizTypes.User);

  // Handle after attribute creation
  const handleAfterCreate = useCallback(
    async (attribute: Partial<Attribute>) => {
      setShowCreateForm(false);
      await refetch();
      if (attribute.codeName) {
        onAttributeChange(attribute.codeName);
      }
    },
    [attributes, onAttributeChange, refetch],
  );

  const handleAttributeChange = (value: string) => {
    if (value === 'create-new') {
      setShowCreateForm(true);
    } else {
      onAttributeChange(value);
    }
  };

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
        <>
          <Select value={selectedAttribute} onValueChange={handleAttributeChange}>
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
                  <SelectItem key={attr.id} value={attr.codeName}>
                    {attr.displayName}
                  </SelectItem>
                ))}
              <SelectItem value="create-new">+ Create new attribute</SelectItem>
            </SelectContent>
          </Select>

          <AttributeCreateForm
            onOpenChange={setShowCreateForm}
            onSuccess={handleAfterCreate}
            isOpen={showCreateForm}
            projectId={projectId}
            zIndex={zIndex + 1}
            defaultValues={{
              dataType: String(dataType),
              bizType: String(AttributeBizTypes.User),
            }}
            disabledFields={['dataType', 'bizType']}
          />
        </>
      )}
    </div>
  );
};
