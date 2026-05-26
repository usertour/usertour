import { Card, CardContent, CardHeader, CardTitle } from '@usertour/card';
import {
  ArrowRightIcon,
  EqualIcon,
  UsertourIcon2,
  SalesforceIcon,
  Delete2Icon,
  SpinnerIcon,
  EditIcon,
} from '@usertour/icons';
import {
  IntegrationObjectMappingModel,
  IntegrationObjectMappingItem,
  IntegrationObjectMappingSettings,
} from '@usertour/types';
import { cn } from '@usertour/tailwind';
import { format } from 'date-fns';
import { Button } from '@usertour/button';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@usertour/dropdown-menu';
import { DotsVerticalIcon } from '@radix-ui/react-icons';
import { useDeleteIntegrationObjectMappingMutation } from '@usertour/hooks';
import { useToast } from '@usertour/use-toast';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { DestructiveConfirmDialog } from '@usertour/ui';
import { ObjectMappingDialog } from './object-mapping-dialog';
import { Switch } from '@usertour/switch';

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

interface ObjectMappingReadonlyButtonProps {
  icon: React.ReactNode;
  label: string;
}

export const ObjectMappingReadonlyButton = (props: ObjectMappingReadonlyButtonProps) => {
  const { icon, label } = props;
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

export const ObjectMappingReadonly = (props: ObjectMappingReadonlyProps) => {
  const { mapping, onDelete, onUpdate } = props;
  const { toast } = useToast();
  const { t } = useTranslation();
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
          variant: 'success',
          title: t('settings.integrations.objectMapping.readonly.deleteSuccessToast'),
        });
        onDelete?.(mapping.id);
        setShowDeleteDialog(false);
      } else {
        toast({
          title: t('settings.integrations.objectMapping.readonly.deleteFailureToast'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to delete mapping:', error);
      toast({
        title: t('settings.integrations.objectMapping.readonly.deleteFailureToast'),
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
                  {t('settings.integrations.objectMapping.readonly.editAction')}
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
                  {t('settings.integrations.objectMapping.readonly.deleteAction')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DestructiveConfirmDialog
              title={t('settings.integrations.objectMapping.readonly.deleteDialogTitle')}
              description={
                <Trans
                  i18nKey="settings.integrations.objectMapping.readonly.deleteDialogDescription"
                  values={{
                    source: mapping.sourceObjectType,
                    target: mapping.destinationObjectType,
                  }}
                  components={{ strong: <strong className="font-bold text-foreground" /> }}
                />
              }
              confirmLabel={t('settings.integrations.objectMapping.readonly.deleteAction')}
              cancelLabel={t('settings.common.cancel')}
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
              onConfirm={handleDelete}
              loading={loading}
            />
          </CardTitle>
          {mapping.lastSyncedAt && (
            <p className="text-sm text-muted-foreground">
              {t('settings.integrations.objectMapping.readonly.lastSynced', {
                date: format(new Date(mapping.lastSyncedAt), 'MMM dd, yyyy HH:mm'),
              })}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Match objects */}
          {matchObjects && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">
                  {t('settings.integrations.objectMapping.matchBy')}
                </span>
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
                <span className="font-medium">
                  {t('settings.integrations.objectMapping.sourceToTargetTitle')}
                </span>
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
                <span className="font-medium">
                  {t('settings.integrations.objectMapping.targetToSourceTitle')}
                </span>
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
              <Trans
                i18nKey="settings.integrations.objectMapping.streamSwitch"
                components={{
                  user: <span className="font-semibold text-primary" />,
                  contact: <span className="font-semibold text-blue-500" />,
                }}
              />
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
