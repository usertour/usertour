import { Button } from '@usertour-ui/button';
import { InfoIcon } from 'lucide-react';
import { SpinnerIcon, EqualIcon, ArrowRightIcon } from '@usertour-ui/icons';
import { Switch } from '@usertour-ui/switch';
import { DialogFooter } from '@usertour-ui/dialog';
import { CustomSelect } from './custom-select';
import { MappingRow } from './mapping-row';
import { AttributeCreateForm } from '@usertour-ui/shared-editor';
import { Attribute, BizAttributeTypes } from '@usertour-ui/types';

interface FieldMappingStepProps {
  selectedBizType: number;
  projectId: string;
  // Match fields
  matchLeft: string;
  matchRight: string;
  onMatchLeftChange: (value: string) => void;
  onMatchRightChange: (value: string) => void;
  // Mappings
  sfToUsertour: Array<{ left: string; right: string; isNew?: boolean }>;
  usertourToSf: Array<{ left: string; right: string; isNew?: boolean }>;
  onSfToUsertourChange: (mappings: Array<{ left: string; right: string; isNew?: boolean }>) => void;
  onUsertourToSfChange: (mappings: Array<{ left: string; right: string; isNew?: boolean }>) => void;
  // Add mappings
  addLeft: string;
  addRight: string;
  addLeft2: string;
  addRight2: string;
  onAddLeftChange: (value: string) => void;
  onAddRightChange: (value: string) => void;
  onAddLeft2Change: (value: string) => void;
  onAddRight2Change: (value: string) => void;
  onAddMapping: () => void;
  onAddMapping2: () => void;
  // Stream events
  stream: boolean;
  onStreamChange: (value: boolean) => void;
  // Actions
  onBack: () => void;
  onSave: () => void;
  isLoading: boolean;
  // Fields
  dynamicSalesforceFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  usertourFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  // Attribute creation
  showCreateAttributeForm: boolean;
  onShowCreateAttributeFormChange: (show: boolean) => void;
  onAfterCreate: (attribute: Partial<Attribute>) => void;
}

export const FieldMappingStep = ({
  selectedBizType,
  projectId,
  matchLeft,
  matchRight,
  onMatchLeftChange,
  onMatchRightChange,
  sfToUsertour,
  usertourToSf,
  onSfToUsertourChange,
  onUsertourToSfChange,
  addLeft,
  addRight,
  addLeft2,
  addRight2,
  onAddLeftChange,
  onAddRightChange,
  onAddLeft2Change,
  onAddRight2Change,
  onAddMapping,
  onAddMapping2,
  stream,
  onStreamChange,
  onBack,
  onSave,
  isLoading,
  dynamicSalesforceFields,
  usertourFields,
  showCreateAttributeForm,
  onShowCreateAttributeFormChange,
  onAfterCreate,
}: FieldMappingStepProps) => {
  const handleCreateAttribute = () => {
    onShowCreateAttributeFormChange(true);
  };

  const removeMapping = (idx: number, direction: 'sfToUsertour' | 'usertourToSf') => {
    if (direction === 'sfToUsertour') {
      onSfToUsertourChange(sfToUsertour.filter((_, i) => i !== idx));
    } else {
      onUsertourToSfChange(usertourToSf.filter((_, i) => i !== idx));
    }
  };

  const updateMapping = (
    idx: number,
    direction: 'sfToUsertour' | 'usertourToSf',
    left: string,
    right: string,
  ) => {
    if (direction === 'sfToUsertour') {
      const arr = [...sfToUsertour];
      arr[idx] = { ...arr[idx], left, right };
      onSfToUsertourChange(arr);
    } else {
      const arr = [...usertourToSf];
      arr[idx] = { ...arr[idx], left, right };
      onUsertourToSfChange(arr);
    }
  };

  return (
    <>
      {/* Object match row */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium">Match objects by</span>
          <InfoIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2">
          <CustomSelect
            items={dynamicSalesforceFields}
            value={matchLeft}
            onValueChange={onMatchLeftChange}
            placeholder="Select field"
          />
          <EqualIcon className="w-4 h-4" />
          <CustomSelect
            items={usertourFields}
            value={matchRight}
            onValueChange={onMatchRightChange}
            placeholder="Select field"
            showCreateAttribute={true}
            onCreateAttribute={handleCreateAttribute}
          />
        </div>
      </div>

      {/* Fields to sync from Salesforce to Usertour */}
      <div className="bg-muted/50 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium">Fields to sync from Salesforce to Usertour</span>
          <InfoIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        {sfToUsertour.map((mapping, idx) => (
          <MappingRow
            key={idx}
            mapping={mapping}
            onMappingChange={(left, right) => updateMapping(idx, 'sfToUsertour', left, right)}
            onRemove={() => removeMapping(idx, 'sfToUsertour')}
            salesforceFields={dynamicSalesforceFields}
            usertourFields={usertourFields}
            showCreateAttribute={true}
            onCreateAttribute={handleCreateAttribute}
          />
        ))}
        {/* Add new mapping row */}
        <div className="flex items-center gap-2 py-1">
          <CustomSelect
            items={dynamicSalesforceFields}
            value={addLeft}
            onValueChange={onAddLeftChange}
            placeholder="Select a field to sync"
          />
          <ArrowRightIcon className="w-4 h-4" />
          <CustomSelect
            items={usertourFields}
            value={addRight}
            onValueChange={onAddRightChange}
            placeholder="..."
            showCreateAttribute={true}
            onCreateAttribute={handleCreateAttribute}
          />
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            disabled={!addLeft || !addRight}
            onClick={onAddMapping}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Fields to sync from Usertour to Salesforce */}
      <div className="bg-muted/50 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium">Fields to sync from Usertour to Salesforce</span>
          <InfoIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        {usertourToSf.map((mapping, idx) => (
          <MappingRow
            key={idx}
            mapping={mapping}
            onMappingChange={(left, right) => updateMapping(idx, 'usertourToSf', left, right)}
            onRemove={() => removeMapping(idx, 'usertourToSf')}
            salesforceFields={dynamicSalesforceFields}
            usertourFields={usertourFields}
            showCreateAttribute={true}
            onCreateAttribute={handleCreateAttribute}
          />
        ))}
        {/* Add new mapping row */}
        <div className="flex items-center gap-2 py-1">
          <CustomSelect
            items={usertourFields}
            value={addLeft2}
            onValueChange={onAddLeft2Change}
            placeholder="Select a field to sync"
            showCreateAttribute={true}
            onCreateAttribute={handleCreateAttribute}
          />
          <ArrowRightIcon className="w-4 h-4" />
          <CustomSelect
            items={dynamicSalesforceFields}
            value={addRight2}
            onValueChange={onAddRight2Change}
            placeholder="..."
          />
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            disabled={!addLeft2 || !addRight2}
            onClick={onAddMapping2}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Stream events switch */}
      <div className="flex items-center gap-3 mb-4">
        <Switch checked={stream} onCheckedChange={onStreamChange} />
        <span>
          Stream <span className="font-semibold text-primary">User events</span>
          <span className="mx-1">→</span>
          <span className="font-semibold text-blue-500">Contact activity</span>
        </span>
        <InfoIcon className="w-4 h-4 text-muted-foreground" />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button onClick={onSave} disabled={isLoading}>
          {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
          Save mapping
        </Button>
      </DialogFooter>

      {/* Attribute Create Form */}
      <AttributeCreateForm
        onOpenChange={onShowCreateAttributeFormChange}
        onSuccess={onAfterCreate}
        isOpen={showCreateAttributeForm}
        projectId={projectId}
        zIndex={1000}
        defaultValues={{
          dataType: String(BizAttributeTypes.String),
          bizType: String(selectedBizType),
        }}
        disabledFields={['bizType']}
      />
    </>
  );
};
