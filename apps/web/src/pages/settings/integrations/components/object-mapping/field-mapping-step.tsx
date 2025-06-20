import { Button } from '@usertour-ui/button';
import { InfoIcon } from 'lucide-react';
import { SpinnerIcon, EqualIcon, ArrowRightIcon, UsertourIcon2 } from '@usertour-ui/icons';
import { Switch } from '@usertour-ui/switch';
import { DialogFooter } from '@usertour-ui/dialog';
import { CustomSelect } from './custom-select';
import { MappingRow } from './mapping-row';
import { AttributeCreateForm } from '@usertour-ui/shared-editor';
import { Attribute, BizAttributeTypes } from '@usertour-ui/types';
import { useState } from 'react';
import { useListAttributesQuery } from '@usertour-ui/shared-hooks';
import { cn } from '@usertour-ui/ui-utils';

interface FieldMappingStepProps {
  selectedBizType: number;
  projectId: string;
  // Fields
  sourceFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  // Actions
  onBack: () => void;
  onSave: (mappingData: MappingData) => void;
  isLoading: boolean;
}

interface MappingData {
  matchFields: { left: string; right: string };
  sourceToTarget: Array<{ left: string; right: string; isNew?: boolean }>;
  targetToSource: Array<{ left: string; right: string; isNew?: boolean }>;
  stream: boolean;
}

const UsertourMappingIcon = ({ className }: { className?: string }) => (
  <UsertourIcon2 className={cn('w-4 h-4 text-primary', className)} />
);

export const FieldMappingStep = ({
  selectedBizType,
  projectId,
  sourceFields,
  onBack,
  onSave,
  isLoading,
}: FieldMappingStepProps) => {
  // Internal state management
  const [matchLeft, setMatchLeft] = useState('email');
  const [matchRight, setMatchRight] = useState('email');
  const { attributes, refetch } = useListAttributesQuery(projectId, selectedBizType);

  // Dynamic usertour fields based on selected object type and available attributes
  const usertourFields = [
    ...(attributes
      ?.filter((attr) => !attr.predefined)
      .map((attr) => ({
        value: attr.codeName,
        label: attr.displayName,
        icon: <UsertourMappingIcon />,
      })) || []),
  ];

  const [sourceToTarget, setSourceToTarget] = useState<
    Array<{ left: string; right: string; isNew?: boolean }>
  >([
    { left: 'title', right: 'title', isNew: true },
    { left: 'industry', right: 'industry', isNew: true },
  ]);

  const [targetToSource, setTargetToSource] = useState<
    Array<{ left: string; right: string; isNew?: boolean }>
  >([{ left: 'nps', right: 'nps', isNew: true }]);

  // Add row state
  const [addLeft, setAddLeft] = useState('');
  const [addRight, setAddRight] = useState('');
  const [addLeft2, setAddLeft2] = useState('');
  const [addRight2, setAddRight2] = useState('');

  // Stream events switch
  const [stream, setStream] = useState(false);

  // Attribute creation
  const [showCreateAttributeForm, setShowCreateAttributeForm] = useState(false);

  const handleCreateAttribute = () => {
    setShowCreateAttributeForm(true);
  };

  const handleAfterCreate = async (attribute: Partial<Attribute>) => {
    setShowCreateAttributeForm(false);
    await refetch();
    if (attribute.codeName) {
      // Set the newly created attribute as selected in the match field
      if (matchRight === '') {
        setMatchRight(attribute.codeName);
      } else {
        // Add to the appropriate mapping array
        setSourceToTarget([
          ...sourceToTarget,
          { left: '', right: attribute.codeName, isNew: true },
        ]);
      }
    }
  };

  const removeMapping = (idx: number, direction: 'sourceToTarget' | 'targetToSource') => {
    if (direction === 'sourceToTarget') {
      setSourceToTarget(sourceToTarget.filter((_, i) => i !== idx));
    } else {
      setTargetToSource(targetToSource.filter((_, i) => i !== idx));
    }
  };

  const updateMapping = (
    idx: number,
    direction: 'sourceToTarget' | 'targetToSource',
    left: string,
    right: string,
  ) => {
    if (direction === 'sourceToTarget') {
      const arr = [...sourceToTarget];
      arr[idx] = { ...arr[idx], left, right };
      setSourceToTarget(arr);
    } else {
      const arr = [...targetToSource];
      arr[idx] = { ...arr[idx], left, right };
      setTargetToSource(arr);
    }
  };

  // Add mapping from source to target
  const addMapping = () => {
    if (addLeft && addRight) {
      setSourceToTarget([...sourceToTarget, { left: addLeft, right: addRight, isNew: true }]);
      setAddLeft('');
      setAddRight('');
    }
  };

  // Add mapping from target to source
  const addMapping2 = () => {
    if (addLeft2 && addRight2) {
      setTargetToSource([...targetToSource, { left: addLeft2, right: addRight2, isNew: true }]);
      setAddLeft2('');
      setAddRight2('');
    }
  };

  const handleSave = () => {
    const mappingData: MappingData = {
      matchFields: { left: matchLeft, right: matchRight },
      sourceToTarget,
      targetToSource,
      stream,
    };
    onSave(mappingData);
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
            items={sourceFields}
            value={matchLeft}
            onValueChange={setMatchLeft}
            placeholder="Select field"
          />
          <EqualIcon className="w-4 h-4" />
          <CustomSelect
            items={usertourFields}
            value={matchRight}
            onValueChange={setMatchRight}
            placeholder="Select field"
            showCreateAttribute={true}
            onCreateAttribute={handleCreateAttribute}
          />
        </div>
      </div>

      {/* Fields to sync from source to target */}
      <div className="bg-muted/50 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium">Fields to sync from source to target</span>
          <InfoIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        {sourceToTarget.map((mapping, idx) => (
          <MappingRow
            key={idx}
            mapping={mapping}
            onMappingChange={(left, right) => updateMapping(idx, 'sourceToTarget', left, right)}
            onRemove={() => removeMapping(idx, 'sourceToTarget')}
            sourceFields={sourceFields}
            targetFields={usertourFields}
            showCreateAttribute={true}
            onCreateAttribute={handleCreateAttribute}
          />
        ))}
        {/* Add new mapping row */}
        <div className="flex items-center gap-2 py-1">
          <CustomSelect
            items={sourceFields}
            value={addLeft}
            onValueChange={setAddLeft}
            placeholder="Select a field to sync"
          />
          <ArrowRightIcon className="w-4 h-4" />
          <CustomSelect
            items={usertourFields}
            value={addRight}
            onValueChange={setAddRight}
            placeholder="..."
            showCreateAttribute={true}
            onCreateAttribute={handleCreateAttribute}
          />
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            disabled={!addLeft || !addRight}
            onClick={addMapping}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Fields to sync from target to source */}
      <div className="bg-muted/50 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium">Fields to sync from target to source</span>
          <InfoIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        {targetToSource.map((mapping, idx) => (
          <MappingRow
            key={idx}
            mapping={mapping}
            onMappingChange={(left, right) => updateMapping(idx, 'targetToSource', left, right)}
            onRemove={() => removeMapping(idx, 'targetToSource')}
            sourceFields={sourceFields}
            targetFields={usertourFields}
            showCreateAttribute={true}
            onCreateAttribute={handleCreateAttribute}
          />
        ))}
        {/* Add new mapping row */}
        <div className="flex items-center gap-2 py-1">
          <CustomSelect
            items={usertourFields}
            value={addLeft2}
            onValueChange={setAddLeft2}
            placeholder="Select a field to sync"
            showCreateAttribute={true}
            onCreateAttribute={handleCreateAttribute}
          />
          <ArrowRightIcon className="w-4 h-4" />
          <CustomSelect
            items={sourceFields}
            value={addRight2}
            onValueChange={setAddRight2}
            placeholder="..."
          />
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            disabled={!addLeft2 || !addRight2}
            onClick={addMapping2}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Stream events switch */}
      <div className="flex items-center gap-3 mb-4">
        <Switch checked={stream} onCheckedChange={setStream} />
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
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
          Save mapping
        </Button>
      </DialogFooter>

      {/* Attribute Create Form */}
      <AttributeCreateForm
        onOpenChange={setShowCreateAttributeForm}
        onSuccess={handleAfterCreate}
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
