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
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { DotsVerticalIcon } from '@radix-ui/react-icons';
import { useDeleteIntegrationObjectMappingMutation } from '@usertour-ui/shared-hooks';
import { useToast } from '@usertour-ui/use-toast';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-ui/alert-dialog';

const UsertourMappingIcon = ({ className }: { className?: string }) => (
  <UsertourIcon2 className={cn('w-4 h-4 text-primary', className)} />
);

const SalesforceMappingIcon = ({ className }: { className?: string }) => (
  <SalesforceIcon className={cn('w-4 h-4', className)} />
);

interface ObjectMappingReadonlyProps {
  mapping: IntegrationObjectMappingModel;
  onDelete?: (mappingId: string) => void;
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

export const ObjectMappingReadonly = ({ mapping, onDelete }: ObjectMappingReadonlyProps) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { invoke: deleteMapping } = useDeleteIntegrationObjectMappingMutation();

  const settings = mapping.settings as IntegrationObjectMappingSettings;
  const matchObjects = settings?.matchObjects;
  const sourceToTarget = settings?.sourceToTarget || [];
  const targetToSource = settings?.targetToSource || [];
  const stream = settings?.isSyncStream || false;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const success = await deleteMapping(mapping.id);

      if (success) {
        toast({
          title: 'Success',
          description: 'Object mapping deleted successfully',
        });
        onDelete?.(mapping.id);
        setShowDeleteDialog(false);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete object mapping',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to delete mapping:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete object mapping',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between relative">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 absolute right-0 top-0">
                <DotsVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                className="text-red-600 cursor-pointer"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Object Mapping</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the mapping between{' '}
                  <strong>{mapping.sourceObjectType}</strong> and{' '}
                  <strong>{mapping.destinationObjectType}</strong>? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
