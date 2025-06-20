import { Button } from '@usertour-ui/button';
import { XIcon } from 'lucide-react';
import { ArrowRightIcon } from '@usertour-ui/icons';
import { CustomSelect } from './custom-select';

interface MappingRowProps {
  mapping: {
    left: string;
    right: string;
    isNew?: boolean;
  };
  onMappingChange: (left: string, right: string) => void;
  onRemove: () => void;
  sourceFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  targetFields: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  showCreateAttribute?: boolean;
  onCreateAttribute?: () => void;
}

export const MappingRow = ({
  mapping,
  onMappingChange,
  onRemove,
  sourceFields,
  targetFields,
  showCreateAttribute = false,
  onCreateAttribute,
}: MappingRowProps) => {
  return (
    <div className="flex items-center gap-2 py-1">
      <CustomSelect
        items={sourceFields}
        value={mapping.left}
        onValueChange={(value) => onMappingChange(value, mapping.right)}
        placeholder="Select field"
      />
      <ArrowRightIcon className="w-4 h-4" />
      <CustomSelect
        items={targetFields}
        value={mapping.right}
        onValueChange={(value) => onMappingChange(mapping.left, value)}
        placeholder="Select field"
        showCreateAttribute={showCreateAttribute}
        onCreateAttribute={onCreateAttribute}
      />
      {mapping.isNew && (
        <span className="ml-2 px-2 py-0.5 text-xs rounded bg-primary/10 text-primary font-medium">
          New
        </span>
      )}
      <Button variant="ghost" size="icon" onClick={onRemove}>
        <XIcon className="w-4 h-4" />
      </Button>
    </div>
  );
};
