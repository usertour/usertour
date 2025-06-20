import { Button } from '@usertour-ui/button';
import { Label } from '@usertour-ui/label';
import { ArrowRightIcon } from '@usertour-ui/icons';
import { DialogFooter } from '@usertour-ui/dialog';
import { ObjectMappingObjectSelect } from './object-mapping-select';

interface ObjectMappingSelectionStepProps {
  salesforceObject: string;
  usertourObject: string;
  onSalesforceObjectChange: (value: string) => void;
  onUsertourObjectChange: (value: string) => void;
  onContinue: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const salesforceObjects = [
  { name: 'Contact', label: 'Contacts', type: 'standard' as const },
  { name: 'Account', label: 'Accounts', type: 'standard' as const },
  { name: 'Lead', label: 'Leads', type: 'standard' as const },
  { name: 'Opportunity', label: 'Opportunities', type: 'standard' as const },
];

const usertourObjects = [
  { name: 'User', label: 'User' },
  { name: 'Company', label: 'Company' },
];

export const ObjectMappingSelectionStep = ({
  salesforceObject,
  usertourObject,
  onSalesforceObjectChange,
  onUsertourObjectChange,
  onContinue,
  onCancel,
  isLoading,
}: ObjectMappingSelectionStepProps) => {
  return (
    <>
      <div className="space-y-1 py-4">
        <div className="flex items-center gap-4 justify-between">
          <Label htmlFor="salesforce-object" className="w-72">
            Salesforce Object
          </Label>
          <div className="w-6" />
          <Label htmlFor="usertour-object" className="w-72">
            Usertour Object
          </Label>
        </div>

        <div className="flex items-center gap-4 justify-between">
          <ObjectMappingObjectSelect
            items={salesforceObjects}
            value={salesforceObject}
            onValueChange={onSalesforceObjectChange}
            placeholder="Select Salesforce object"
          />

          <div className="flex items-center justify-center">
            <ArrowRightIcon className="h-6 w-6 text-muted-foreground" />
          </div>

          <ObjectMappingObjectSelect
            items={usertourObjects}
            value={usertourObject}
            onValueChange={onUsertourObjectChange}
            placeholder="Select Usertour object"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={onContinue} disabled={!salesforceObject || !usertourObject}>
          Continue
        </Button>
      </DialogFooter>
    </>
  );
};
