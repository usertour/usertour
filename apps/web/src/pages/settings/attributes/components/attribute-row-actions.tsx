import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useAppContext } from '@/contexts/app-context';
import { Attribute } from '@usertour/types';
import { Delete2Icon, EditIcon } from '@usertour/icons';
import { ResourceRowActions } from '@usertour/ui';
import { AttributeDeleteDialog } from './attribute-delete-dialog';
import { AttributeEditDialog } from './attribute-edit-dialog';

interface AttributeRowActionsProps {
  attribute: Attribute;
}

export const AttributeRowActions = ({ attribute }: AttributeRowActionsProps) => {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { refetch } = useAttributeListContext();
  const { isViewOnly } = useAppContext();
  const { t } = useTranslation();

  return (
    <>
      <ResourceRowActions
        disabled={attribute.predefined || isViewOnly}
        disabledHint={
          attribute.predefined ? (
            <p>
              {t('settings.common.predefinedTooltip', {
                resource: t('settings.attributes.predefinedResource'),
              })}
            </p>
          ) : undefined
        }
        items={[
          {
            key: 'edit',
            icon: <EditIcon className="w-6" width={12} height={12} />,
            label: t('settings.attributes.editMenuItem'),
            onSelect: () => setEditOpen(true),
          },
          {
            key: 'delete',
            icon: <Delete2Icon className="w-6" width={16} height={16} />,
            label: t('settings.attributes.deleteMenuItem'),
            destructive: true,
            separatorBefore: true,
            onSelect: () => setDeleteOpen(true),
          },
        ]}
      />
      <AttributeEditDialog
        attribute={attribute}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={() => refetch()}
      />
      <AttributeDeleteDialog
        data={attribute}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSubmit={() => refetch()}
      />
    </>
  );
};

AttributeRowActions.displayName = 'AttributeRowActions';
