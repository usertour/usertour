import { Button } from '@usertour-ui/button';
import { InfoIcon, XIcon } from 'lucide-react';
import { EqualIcon, ArrowRightIcon, UsertourIcon2 } from '@usertour-ui/icons';
import { ObjectMappingFieldSelect } from './object-mapping-select';
import { AttributeCreateForm } from '@usertour-ui/shared-editor';
import { Attribute, BizAttributeTypes } from '@usertour-ui/types';
import { useState } from 'react';
import { useListAttributesQuery } from '@usertour-ui/shared-hooks';
import { cn } from '@usertour-ui/ui-utils';

interface ObjectMappingFieldStepProps {
  selectedBizType: number;
  projectId: string;
  sourceFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
}

interface MappingSectionProps {
  direction: MappingDirection;
  title: string;
  sourceFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  targetFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  sourceValue: string;
  targetValue: string;
  onSourceChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  mappings: MappingItem[];
  onMappingChange: (idx: number, direction: MappingDirection, left: string, right: string) => void;
  onRemove: (idx: number, direction: MappingDirection) => void;
  onAdd: (direction: MappingDirection) => void;
  showCreateAttribute: boolean;
  onCreateAttribute: () => void;
}

const UsertourMappingIcon = ({ className }: { className?: string }) => (
  <UsertourIcon2 className={cn('w-4 h-4 text-primary', className)} />
);

type MappingDirection = 'sourceToTarget' | 'targetToSource';
type MappingItem = { left: string; right: string; isNew?: boolean };

// Mapping section component
const MappingSection = ({
  direction,
  title,
  sourceFields,
  targetFields,
  sourceValue,
  targetValue,
  onSourceChange,
  onTargetChange,
  mappings,
  onMappingChange,
  onRemove,
  onAdd,
  showCreateAttribute,
  onCreateAttribute,
}: MappingSectionProps) => {
  return (
    <div className="bg-muted/50 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium">{title}</span>
        <InfoIcon className="w-4 h-4 text-muted-foreground" />
      </div>
      {mappings.map((mapping, idx) => (
        <div key={idx} className="flex items-center gap-2 py-1">
          <ObjectMappingFieldSelect
            items={sourceFields}
            value={mapping.left}
            onValueChange={(value) => onMappingChange(idx, direction, value, mapping.right)}
            placeholder="Select field"
          />
          <ArrowRightIcon className="w-4 h-4" />
          <ObjectMappingFieldSelect
            items={targetFields}
            value={mapping.right}
            onValueChange={(value) => onMappingChange(idx, direction, mapping.left, value)}
            placeholder="Select field"
            showCreateAttribute={showCreateAttribute}
            onCreateAttribute={onCreateAttribute}
          />
          {mapping.isNew && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-primary/10 text-primary font-medium">
              New
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={() => onRemove(idx, direction)}>
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      ))}
      {/* Add new mapping row */}
      <div className="flex items-center gap-2 py-1">
        <ObjectMappingFieldSelect
          items={sourceFields}
          value={sourceValue}
          onValueChange={onSourceChange}
          placeholder="Select a field to sync"
          showCreateAttribute={showCreateAttribute}
          onCreateAttribute={onCreateAttribute}
        />
        <ArrowRightIcon className="w-4 h-4" />
        <ObjectMappingFieldSelect
          items={targetFields}
          value={targetValue}
          onValueChange={onTargetChange}
          placeholder="..."
          showCreateAttribute={showCreateAttribute}
          onCreateAttribute={onCreateAttribute}
        />
        <Button
          variant="outline"
          size="sm"
          className="ml-2"
          disabled={!sourceValue || !targetValue}
          onClick={() => onAdd(direction)}
        >
          Add
        </Button>
      </div>
    </div>
  );
};

export const ObjectMappingFieldStep = ({
  selectedBizType,
  projectId,
  sourceFields,
}: ObjectMappingFieldStepProps) => {
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

  // Mapping state
  const [sourceToTarget, setSourceToTarget] = useState<MappingItem[]>([
    { left: 'title', right: 'title', isNew: true },
    { left: 'industry', right: 'industry', isNew: true },
  ]);

  const [targetToSource, setTargetToSource] = useState<MappingItem[]>([
    { left: 'nps', right: 'nps', isNew: true },
  ]);

  // New mapping input state
  const [newSourceToTargetSource, setNewSourceToTargetSource] = useState('');
  const [newSourceToTargetTarget, setNewSourceToTargetTarget] = useState('');
  const [newTargetToSourceSource, setNewTargetToSourceSource] = useState('');
  const [newTargetToSourceTarget, setNewTargetToSourceTarget] = useState('');

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

  // Generic mapping operations
  const getMappingArray = (direction: MappingDirection) => {
    return direction === 'sourceToTarget' ? sourceToTarget : targetToSource;
  };

  const setMappingArray = (direction: MappingDirection, newArray: MappingItem[]) => {
    if (direction === 'sourceToTarget') {
      setSourceToTarget(newArray);
    } else {
      setTargetToSource(newArray);
    }
  };

  const removeMapping = (idx: number, direction: MappingDirection) => {
    const currentArray = getMappingArray(direction);
    const newArray = currentArray.filter((_, i) => i !== idx);
    setMappingArray(direction, newArray);
  };

  const updateMapping = (idx: number, direction: MappingDirection, left: string, right: string) => {
    const currentArray = getMappingArray(direction);
    const newArray = [...currentArray];
    newArray[idx] = { ...newArray[idx], left, right };
    setMappingArray(direction, newArray);
  };

  const addMapping = (direction: MappingDirection) => {
    const getSourceValue = () =>
      direction === 'sourceToTarget' ? newSourceToTargetSource : newTargetToSourceSource;
    const getTargetValue = () =>
      direction === 'sourceToTarget' ? newSourceToTargetTarget : newTargetToSourceTarget;
    const setSourceValue = (value: string) =>
      direction === 'sourceToTarget'
        ? setNewSourceToTargetSource(value)
        : setNewTargetToSourceSource(value);
    const setTargetValue = (value: string) =>
      direction === 'sourceToTarget'
        ? setNewSourceToTargetTarget(value)
        : setNewTargetToSourceTarget(value);

    const sourceValue = getSourceValue();
    const targetValue = getTargetValue();

    if (sourceValue && targetValue) {
      const currentArray = getMappingArray(direction);
      setMappingArray(direction, [
        ...currentArray,
        { left: sourceValue, right: targetValue, isNew: true },
      ]);
      setSourceValue('');
      setTargetValue('');
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
          <ObjectMappingFieldSelect
            items={sourceFields}
            value={matchLeft}
            onValueChange={setMatchLeft}
            placeholder="Select field"
          />
          <EqualIcon className="w-4 h-4" />
          <ObjectMappingFieldSelect
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
      <MappingSection
        direction="sourceToTarget"
        title="Fields to sync from source to target"
        sourceFields={sourceFields}
        targetFields={usertourFields}
        sourceValue={newSourceToTargetSource}
        targetValue={newSourceToTargetTarget}
        onSourceChange={setNewSourceToTargetSource}
        onTargetChange={setNewSourceToTargetTarget}
        mappings={sourceToTarget}
        onMappingChange={updateMapping}
        onRemove={removeMapping}
        onAdd={addMapping}
        showCreateAttribute={true}
        onCreateAttribute={handleCreateAttribute}
      />

      {/* Fields to sync from target to source */}
      <MappingSection
        direction="targetToSource"
        title="Fields to sync from target to source"
        sourceFields={usertourFields}
        targetFields={sourceFields}
        sourceValue={newTargetToSourceSource}
        targetValue={newTargetToSourceTarget}
        onSourceChange={setNewTargetToSourceSource}
        onTargetChange={setNewTargetToSourceTarget}
        mappings={targetToSource}
        onMappingChange={updateMapping}
        onRemove={removeMapping}
        onAdd={addMapping}
        showCreateAttribute={false}
        onCreateAttribute={handleCreateAttribute}
      />

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
