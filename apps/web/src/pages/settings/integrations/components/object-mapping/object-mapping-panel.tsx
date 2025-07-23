import { Button } from '@usertour-packages/button';
import { InfoIcon, XIcon } from 'lucide-react';
import { ArrowRightIcon, EqualIcon, UsertourIcon2 } from '@usertour-packages/icons';
import { ObjectMappingFieldSelect } from './object-mapping-select';
import { AttributeCreateForm } from '@usertour-packages/shared-editor';
import {
  Attribute,
  BizAttributeTypes,
  IntegrationObjectMappingSettings,
  IntegrationObjectMappingItem,
} from '@usertour-packages/types';
import { useState } from 'react';
import { useListAttributesQuery } from '@usertour-packages/shared-hooks';
import { cn } from '@usertour-packages/utils';

const UsertourMappingIcon = ({ className }: { className?: string }) => (
  <UsertourIcon2 className={cn('w-4 h-4 text-primary', className)} />
);

interface ObjectMappingPanelProps {
  selectedBizType: number;
  projectId: string;
  sourceFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  sourceObjectType: string;
  targetObjectType: string;
  initialMapping?: IntegrationObjectMappingSettings;
  onMappingChange?: (mapping: IntegrationObjectMappingSettings) => void;
}

interface ObjectMappingSectionProps {
  title: string;
  sourceFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  targetFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  mappings: IntegrationObjectMappingItem[];
  onMappingsChange: (mappings: IntegrationObjectMappingItem[]) => void;
  showCreateAttributeLeft: boolean;
  showCreateAttributeRight: boolean;
  projectId: string;
  selectedBizType: number;
  refetch: () => Promise<any>;
  sourceObjectType: string;
  targetObjectType: string;
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
  sourceObjectType,
  targetObjectType,
}: ObjectMappingSectionProps) => {
  // Internal state for adding new mappings
  const [newSourceValue, setNewSourceValue] = useState('');
  const [newTargetValue, setNewTargetValue] = useState('');

  // Filter out already selected fields from dropdown options
  const getAvailableSourceFields = () => {
    const selectedSourceFields = mappings.map((m) => m.sourceFieldName).filter(Boolean);
    return sourceFields.filter((field) => !selectedSourceFields.includes(field.value));
  };

  const getAvailableTargetFields = () => {
    const selectedTargetFields = mappings.map((m) => m.targetFieldName).filter(Boolean);
    return targetFields.filter((field) => !selectedTargetFields.includes(field.value));
  };

  const handleAddMapping = () => {
    if (newSourceValue && newTargetValue) {
      const newMapping: IntegrationObjectMappingItem = {
        sourceFieldName: newSourceValue,
        sourceObjectType,
        targetFieldName: newTargetValue,
        targetObjectType,
        isNew: true, // New mappings are always marked as new
      };
      onMappingsChange([...mappings, newMapping]);
      setNewSourceValue('');
      setNewTargetValue('');
    }
  };

  const handleUpdateMapping = (idx: number, sourceFieldName: string, targetFieldName: string) => {
    const newMappings = [...mappings];
    newMappings[idx] = {
      ...newMappings[idx],
      sourceFieldName,
      targetFieldName,
    };
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
            sourceValue={mapping.sourceFieldName}
            targetValue={mapping.targetFieldName}
            onSourceChange={(value) => handleUpdateMapping(idx, value, mapping.targetFieldName)}
            onTargetChange={(value) => handleUpdateMapping(idx, mapping.sourceFieldName, value)}
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
  sourceObjectType,
  targetObjectType,
  initialMapping,
  onMappingChange,
}: ObjectMappingPanelProps) => {
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

  // Single state for all mapping data
  const [mappingConfig, setMappingConfig] = useState<IntegrationObjectMappingSettings>(
    initialMapping || {
      matchObjects: {
        sourceFieldName: 'email',
        sourceObjectType,
        targetFieldName: 'email',
        targetObjectType,
        isNew: false,
      },
      sourceToTarget: [],
      targetToSource: [],
    },
  );

  // Update mapping config and notify parent
  const updateMappingConfig = (updates: Partial<IntegrationObjectMappingSettings>) => {
    setMappingConfig((prevConfig) => {
      const newConfig = { ...prevConfig, ...updates };
      onMappingChange?.(newConfig);
      return newConfig;
    });
  };

  // Update match objects
  const handleMatchObjectsChange = (sourceFieldName: string, targetFieldName: string) => {
    updateMappingConfig({
      matchObjects: {
        sourceFieldName,
        sourceObjectType,
        targetFieldName,
        targetObjectType,
        isNew: false,
      },
    });
  };

  // Update source to target mappings
  const handleSourceToTargetChange = (newMappings: IntegrationObjectMappingItem[]) => {
    updateMappingConfig({ sourceToTarget: newMappings });
  };

  // Update target to source mappings
  const handleTargetToSourceChange = (newMappings: IntegrationObjectMappingItem[]) => {
    updateMappingConfig({ targetToSource: newMappings });
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
          <ObjectMappingFieldPair
            sourceFields={sourceFields}
            targetFields={usertourFields}
            sourceValue={mappingConfig.matchObjects.sourceFieldName}
            targetValue={mappingConfig.matchObjects.targetFieldName}
            onSourceChange={(value) =>
              handleMatchObjectsChange(value, mappingConfig.matchObjects.targetFieldName)
            }
            onTargetChange={(value) =>
              handleMatchObjectsChange(mappingConfig.matchObjects.sourceFieldName, value)
            }
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
        mappings={mappingConfig.sourceToTarget}
        onMappingsChange={handleSourceToTargetChange}
        showCreateAttributeLeft={false}
        showCreateAttributeRight={true}
        projectId={projectId}
        selectedBizType={selectedBizType}
        refetch={refetch}
        sourceObjectType={sourceObjectType}
        targetObjectType={targetObjectType}
      />

      {/* Fields to sync from target to source */}
      <ObjectMappingSection
        title="Fields to sync from target to source"
        sourceFields={usertourFields}
        targetFields={sourceFields}
        mappings={mappingConfig.targetToSource}
        onMappingsChange={handleTargetToSourceChange}
        showCreateAttributeLeft={true}
        showCreateAttributeRight={false}
        projectId={projectId}
        selectedBizType={selectedBizType}
        refetch={refetch}
        sourceObjectType={targetObjectType}
        targetObjectType={sourceObjectType}
      />
    </>
  );
};
