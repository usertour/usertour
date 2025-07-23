import { Switch } from '@usertour-packages/switch';
import { Label } from '@usertour-packages/label';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import { Attribute, AttributeBizTypes, BizAttributeTypes } from '@usertour-packages/types';
import { AttributeCreateForm } from '../../form/attribute-create-form';
import { useCallback, useState } from 'react';
import { useListAttributesQuery } from '@usertour-packages/shared-hooks';
import { Button } from '@usertour-packages/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-packages/command';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { cn } from '@usertour-packages/ui-utils';

interface BindAttributeProps {
  bindToAttribute: boolean;
  selectedAttribute?: string;
  zIndex: number;
  onBindChange: (checked: boolean) => void;
  onAttributeChange: (value: string) => void;
  dataType?: BizAttributeTypes; // Optional parameter for different input types
  projectId: string;
  popoverContentClassName?: string;
}

export const BindAttribute = ({
  bindToAttribute,
  selectedAttribute,
  zIndex,
  onBindChange,
  onAttributeChange,
  dataType = BizAttributeTypes.Number, // Default to Number for NPS
  projectId,
  popoverContentClassName,
}: BindAttributeProps) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [open, setOpen] = useState(false);
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
      setOpen(false);
    } else {
      onAttributeChange(value);
      setOpen(false);
    }
  };

  const selectedAttributeData = attributes?.find((attr) => attr.codeName === selectedAttribute);
  const filteredAttributes = attributes?.filter(
    (attr) =>
      attr.bizType === AttributeBizTypes.User && !attr.predefined && attr.dataType === dataType,
  );

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
          <div className="flex flex-row">
            <Popover.Popover open={open} onOpenChange={setOpen}>
              <Popover.PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-between">
                  {selectedAttributeData?.displayName || 'Select user attribute'}
                  <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </Popover.PopoverTrigger>
              <Popover.PopoverContent
                className={cn(
                  'w-64 p-0 border border-border rounded-md shadow-md',
                  popoverContentClassName,
                )}
                style={{ zIndex }}
              >
                <Command>
                  <CommandInput placeholder="Search attributes..." />
                  <CommandEmpty>No attributes found.</CommandEmpty>
                  <ScrollArea className="h-72">
                    <CommandGroup heading="User attributes">
                      {filteredAttributes?.map((attr) => (
                        <CommandItem
                          key={attr.id}
                          value={attr.codeName}
                          className="cursor-pointer"
                          onSelect={() => handleAttributeChange(attr.codeName)}
                        >
                          {attr.displayName}
                          <CheckIcon
                            className={cn(
                              'ml-auto h-4 w-4',
                              selectedAttribute === attr.codeName ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading="Actions">
                      <CommandItem
                        value="create-new"
                        className="cursor-pointer"
                        onSelect={() => handleAttributeChange('create-new')}
                      >
                        + Create new attribute
                      </CommandItem>
                    </CommandGroup>
                  </ScrollArea>
                </Command>
              </Popover.PopoverContent>
            </Popover.Popover>
          </div>

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
