import { Button } from '@usertour-ui/button';
import { InfoIcon, XIcon } from 'lucide-react';
import { ArrowRightIcon, EqualIcon, UsertourIcon2 } from '@usertour-ui/icons';
import { ObjectMappingFieldSelect } from './object-mapping-select';
import { AttributeCreateForm } from '@usertour-ui/shared-editor';
import { Attribute, BizAttributeTypes } from '@usertour-ui/types';
import { useState } from 'react';
import { useListAttributesQuery } from '@usertour-ui/shared-hooks';
import { cn } from '@usertour-ui/ui-utils';

const UsertourMappingIcon = ({ className }: { className?: string }) => (
  <UsertourIcon2 className={cn('w-4 h-4 text-primary', className)} />
);

interface ObjectMappingPanelProps {
  selectedBizType: number;
  projectId: string;
  sourceFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
}

interface ObjectMappingSectionProps {
  title: string;
  sourceFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  targetFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  mappings: MappingItem[];
  onMappingsChange: (mappings: MappingItem[]) => void;
  showCreateAttributeLeft: boolean;
  showCreateAttributeRight: boolean;
  projectId: string;
  selectedBizType: number;
  refetch: () => Promise<any>;
}

interface ObjectMappingFieldPairProps {
  sourceFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  targetFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  sourceValue: string;
  targetValue: string;
  onSourceChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  showCreateAttributeLeft: boolean;
  showCreateAttributeRight: boolean;
  projectId: string;
  selectedBizType: number;
  refetch: () => Promise<any>;
  disabled?: boolean;
  centerIcon?: React.ReactNode;
}

type MappingItem = { left: string; right: string; isNew?: boolean };

// Core object mapping field pair selector component
const ObjectMappingFieldPair = ({
  sourceFields,
  targetFields,
  sourceValue,
  targetValue,
  onSourceChange,
  onTargetChange,
  showCreateAttributeLeft,
  showCreateAttributeRight,
  projectId,
  selectedBizType,
  refetch,
  disabled = false,
  centerIcon,
}: ObjectMappingFieldPairProps) => {
  // Attribute creation state
  const [showCreateAttributeForm, setShowCreateAttributeForm] = useState(false);

  const handleCreateAttribute = () => {
    setShowCreateAttributeForm(true);
  };

  const handleAfterCreate = async (attribute: Partial<Attribute>) => {
    setShowCreateAttributeForm(false);
    await refetch();
    if (attribute.codeName) {
      // Set the newly created attribute to the target field
      onTargetChange(attribute.codeName);
    }
  };

  return (
    <>
      <ObjectMappingFieldSelect
        items={sourceFields}
        value={sourceValue}
        onValueChange={onSourceChange}
        placeholder="Select field"
        showCreateAttribute={showCreateAttributeLeft}
        onCreateAttribute={handleCreateAttribute}
        disabled={disabled}
      />
      {centerIcon}
      <ObjectMappingFieldSelect
        items={targetFields}
        value={targetValue}
        onValueChange={onTargetChange}
        placeholder="Select field"
        showCreateAttribute={showCreateAttributeRight}
        onCreateAttribute={handleCreateAttribute}
        disabled={disabled}
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

// Object mapping section component
const ObjectMappingSection = ({
  title,
  sourceFields,
  targetFields,
  mappings,
  onMappingsChange,
  showCreateAttributeLeft,
  showCreateAttributeRight,
  projectId,
  selectedBizType,
  refetch,
}: ObjectMappingSectionProps) => {
  // Internal state for adding new mappings
  const [newSourceValue, setNewSourceValue] = useState('');
  const [newTargetValue, setNewTargetValue] = useState('');

  // Filter out already selected fields from dropdown options
  const getAvailableSourceFields = () => {
    const selectedSourceFields = mappings.map((m) => m.left).filter(Boolean);
    return sourceFields.filter((field) => !selectedSourceFields.includes(field.value));
  };

  const getAvailableTargetFields = () => {
    const selectedTargetFields = mappings.map((m) => m.right).filter(Boolean);
    return targetFields.filter((field) => !selectedTargetFields.includes(field.value));
  };

  const handleAddMapping = () => {
    if (newSourceValue && newTargetValue) {
      onMappingsChange([...mappings, { left: newSourceValue, right: newTargetValue, isNew: true }]);
      setNewSourceValue('');
      setNewTargetValue('');
    }
  };

  const handleUpdateMapping = (idx: number, left: string, right: string) => {
    const newMappings = [...mappings];
    newMappings[idx] = { ...newMappings[idx], left, right };
    onMappingsChange(newMappings);
  };

  const handleRemoveMapping = (idx: number) => {
    onMappingsChange(mappings.filter((_, i) => i !== idx));
  };

  return (
    <div className="bg-muted/50 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium">{title}</span>
        <InfoIcon className="w-4 h-4 text-muted-foreground" />
      </div>
      {mappings.map((mapping, idx) => (
        <div key={idx} className="flex items-center gap-2 py-1">
          <ObjectMappingFieldPair
            sourceFields={sourceFields}
            targetFields={targetFields}
            sourceValue={mapping.left}
            targetValue={mapping.right}
            onSourceChange={(value) => handleUpdateMapping(idx, value, mapping.right)}
            onTargetChange={(value) => handleUpdateMapping(idx, mapping.left, value)}
            showCreateAttributeLeft={showCreateAttributeLeft}
            showCreateAttributeRight={showCreateAttributeRight}
            projectId={projectId}
            selectedBizType={selectedBizType}
            refetch={refetch}
            disabled={true}
            centerIcon={<ArrowRightIcon className="w-4 h-4" />}
          />
          {mapping.isNew && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-primary/10 text-primary font-medium">
              New
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={() => handleRemoveMapping(idx)}>
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      ))}
      {/* Add new mapping row */}
      <div className="flex items-center gap-2">
        <ObjectMappingFieldPair
          sourceFields={getAvailableSourceFields()}
          targetFields={getAvailableTargetFields()}
          sourceValue={newSourceValue}
          targetValue={newTargetValue}
          onSourceChange={setNewSourceValue}
          onTargetChange={setNewTargetValue}
          showCreateAttributeLeft={showCreateAttributeLeft}
          showCreateAttributeRight={showCreateAttributeRight}
          projectId={projectId}
          selectedBizType={selectedBizType}
          refetch={refetch}
          centerIcon={<ArrowRightIcon className="w-4 h-4" />}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={!newSourceValue || !newTargetValue}
          onClick={handleAddMapping}
        >
          Add
        </Button>
      </div>
    </div>
  );
};

export const ObjectMappingPanel = ({
  selectedBizType,
  projectId,
  sourceFields,
}: ObjectMappingPanelProps) => {
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

  return (
    <>
      {/* Object match row */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium">Match objects by</span>
          <InfoIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2">
          <ObjectMappingFieldPair
            sourceFields={sourceFields}
            targetFields={usertourFields}
            sourceValue={matchLeft}
            targetValue={matchRight}
            onSourceChange={setMatchLeft}
            onTargetChange={setMatchRight}
            showCreateAttributeLeft={false}
            showCreateAttributeRight={true}
            projectId={projectId}
            selectedBizType={selectedBizType}
            refetch={refetch}
            centerIcon={<EqualIcon className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Fields to sync from source to target */}
      <ObjectMappingSection
        title="Fields to sync from source to target"
        sourceFields={sourceFields}
        targetFields={usertourFields}
        mappings={sourceToTarget}
        onMappingsChange={setSourceToTarget}
        showCreateAttributeLeft={false}
        showCreateAttributeRight={true}
        projectId={projectId}
        selectedBizType={selectedBizType}
        refetch={refetch}
      />

      {/* Fields to sync from target to source */}
      <ObjectMappingSection
        title="Fields to sync from target to source"
        sourceFields={usertourFields}
        targetFields={sourceFields}
        mappings={targetToSource}
        onMappingsChange={setTargetToSource}
        showCreateAttributeLeft={true}
        showCreateAttributeRight={false}
        projectId={projectId}
        selectedBizType={selectedBizType}
        refetch={refetch}
      />
    </>
  );
};
