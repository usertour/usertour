import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';
import {
  ArrowRightIcon,
  EqualIcon,
  UsertourIcon2,
  SalesforceIcon,
  Delete2Icon,
  SpinnerIcon,
  EditIcon,
} from '@usertour-packages/icons';
import {
  IntegrationObjectMappingModel,
  IntegrationObjectMappingItem,
  IntegrationObjectMappingSettings,
} from '@usertour-packages/types';
import { cn } from '@usertour-packages/ui-utils';
import { format } from 'date-fns';
import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { DotsVerticalIcon } from '@radix-ui/react-icons';
import { useDeleteIntegrationObjectMappingMutation } from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { LoadingButton } from '../../../../../components/molecules/loading-button';
import { ObjectMappingDialog } from './object-mapping-dialog';
import { Switch } from '@usertour-packages/switch';

const UsertourMappingIcon = ({ className }: { className?: string }) => (
  <UsertourIcon2 className={cn('w-4 h-4 text-primary', className)} />
);

const SalesforceMappingIcon = ({ className }: { className?: string }) => (
  <SalesforceIcon className={cn('w-4 h-4', className)} />
);

interface ObjectMappingReadonlyProps {
  mapping: IntegrationObjectMappingModel;
  onDelete?: (mappingId: string) => void;
  onUpdate?: () => void;
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

export const ObjectMappingReadonly = ({
  mapping,
  onDelete,
  onUpdate,
}: ObjectMappingReadonlyProps) => {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { invoke: deleteMapping, loading } = useDeleteIntegrationObjectMappingMutation();

  const settings = mapping.settings as IntegrationObjectMappingSettings;
  const matchObjects = settings?.matchObjects;
  const sourceToTarget = settings?.sourceToTarget || [];
  const targetToSource = settings?.targetToSource || [];
  const isSyncStream = settings?.isSyncStream || false;

  const handleDelete = async () => {
    try {
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
    }
  };

  return (
    <>
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
                  className="cursor-pointer"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <EditIcon className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={loading}
                >
                  {loading ? (
                    <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Delete2Icon className="w-4 h-4 mr-2" />
                  )}
                  Delete
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
                  <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                  <LoadingButton onClick={handleDelete} loading={loading} variant="destructive">
                    Delete
                  </LoadingButton>
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
              </div>
              {targetToSource.map((mappingItem: IntegrationObjectMappingItem, idx: number) => (
                <div key={idx} className="flex items-center gap-2 py-1">
                  <ObjectMappingReadonlyButton
                    icon={<UsertourMappingIcon />}
                    label={mappingItem.targetFieldName}
                  />
                  <ArrowRightIcon className="w-4 h-4" />
                  <ObjectMappingReadonlyButton
                    icon={<SalesforceIcon />}
                    label={mappingItem.sourceFieldName}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 mb-4">
            <Switch className="data-[state=unchecked]:bg-input" checked={isSyncStream} disabled />
            <span>
              Stream <span className="font-semibold text-primary">User events</span>
              <span className="mx-1">→</span>
              <span className="font-semibold text-blue-500">Contact activity</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <ObjectMappingDialog
        integrationId={mapping.integrationId}
        initialMapping={mapping}
        onSuccess={onUpdate}
        mode="edit"
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </>
  );
};
