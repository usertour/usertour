import { Card, CardContent, CardHeader, CardTitle } from '@usertour-ui/card';
import { Badge } from '@usertour-ui/badge';
import { InfoIcon } from 'lucide-react';
import { ArrowRightIcon, EqualIcon, UsertourIcon2, SalesforceIcon } from '@usertour-ui/icons';
import {
  IntegrationObjectMappingModel,
  IntegrationObjectMappingItem,
  IntegrationObjectMappingSettings,
} from '@usertour-ui/types';
import { cn } from '@usertour-ui/ui-utils';
import { format } from 'date-fns';
import { Button } from '@usertour-ui/button';

const UsertourMappingIcon = ({ className }: { className?: string }) => (
  <UsertourIcon2 className={cn('w-4 h-4 text-primary', className)} />
);

const SalesforceMappingIcon = ({ className }: { className?: string }) => (
  <SalesforceIcon className={cn('w-4 h-4', className)} />
);

interface ObjectMappingReadonlyProps {
  mapping: IntegrationObjectMappingModel;
}

export const ObjectMappingReadonlyButton = ({
  icon,
  label,
}: { icon: React.ReactNode; label: string }) => {
  return (
    <Button
      variant="outline"
      className={cn('w-72 justify-between', 'disabled:opacity-100')}
      disabled={true}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>
    </Button>
  );
};

export const ObjectMappingReadonly = ({ mapping }: ObjectMappingReadonlyProps) => {
  console.log('mapping', mapping);
  const settings = mapping.settings as IntegrationObjectMappingSettings;
  const matchObjects = settings?.matchObjects;
  const sourceToTarget = settings?.sourceToTarget || [];
  const targetToSource = settings?.targetToSource || [];
  const stream = settings?.isSyncStream || false;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <SalesforceMappingIcon className="w-5 h-5" />
              {mapping.sourceObjectType}
            </span>
            <ArrowRightIcon className="w-5 h-5" />
            <span className="flex items-center gap-1">
              <UsertourMappingIcon className="w-5 h-5" />
              {mapping.destinationObjectType}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={mapping.enabled ? 'default' : 'secondary'}>
              {mapping.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            {mapping.isSyncing && (
              <Badge variant="outline" className="text-blue-600">
                Syncing
              </Badge>
            )}
          </div>
        </CardTitle>
        {mapping.lastSyncedAt && (
          <p className="text-sm text-muted-foreground">
            Last synced: {format(new Date(mapping.lastSyncedAt), 'MMM dd, yyyy HH:mm')}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Match objects */}
        {matchObjects && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">Match objects by</span>
              <InfoIcon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <ObjectMappingReadonlyButton
                icon={<SalesforceMappingIcon />}
                label={matchObjects.sourceFieldName}
              />
              <EqualIcon className="w-4 h-4" />
              <ObjectMappingReadonlyButton
                icon={<UsertourMappingIcon />}
                label={matchObjects.targetFieldName}
              />
            </div>
          </div>
        )}

        {/* Source to target mappings */}
        {sourceToTarget.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">Fields to sync from source to target</span>
              <InfoIcon className="w-4 h-4 text-muted-foreground" />
            </div>
            {sourceToTarget.map((mappingItem: IntegrationObjectMappingItem, idx: number) => (
              <div key={idx} className="flex items-center gap-2 py-1">
                <ObjectMappingReadonlyButton
                  icon={<SalesforceMappingIcon />}
                  label={mappingItem.sourceFieldName}
                />
                <ArrowRightIcon className="w-4 h-4" />
                <ObjectMappingReadonlyButton
                  icon={<UsertourMappingIcon />}
                  label={mappingItem.targetFieldName}
                />
              </div>
            ))}
          </div>
        )}

        {/* Target to source mappings */}
        {targetToSource.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">Fields to sync from target to source</span>
              <InfoIcon className="w-4 h-4 text-muted-foreground" />
            </div>
            {targetToSource.map((mappingItem: IntegrationObjectMappingItem, idx: number) => (
              <div key={idx} className="flex items-center gap-2 py-1">
                <ObjectMappingReadonlyButton
                  icon={<UsertourMappingIcon />}
                  label={mappingItem.targetFieldName}
                />
                <ArrowRightIcon className="w-4 h-4" />
                <ObjectMappingReadonlyButton
                  icon={<SalesforceMappingIcon />}
                  label={mappingItem.sourceFieldName}
                />
              </div>
            ))}
          </div>
        )}

        {/* Stream events */}
        {stream && (
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-green-600">
              Stream enabled
            </Badge>
            <span className="text-sm text-muted-foreground">User events → Contact activity</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
