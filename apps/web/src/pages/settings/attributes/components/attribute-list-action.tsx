import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useAppContext } from '@/contexts/app-context';
import { Attribute } from '@usertour/types';
import { Delete2Icon, EditIcon } from '@usertour/icons';
import { ResourceRowActions } from '@usertour/ui';
import { AttributeDeleteForm } from './attribute-delete-form';
import { AttributeEditForm } from './attribute-edit-form';

interface AttributeListActionProps {
  attribute: Attribute;
}

export const AttributeListAction = ({ attribute }: AttributeListActionProps) => {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { refetch } = useAttributeListContext();
  const { isViewOnly } = useAppContext();
  const { t } = useTranslation();

  const closeAfterRefetch = (setter: (next: boolean) => void) => () => {
    setter(false);
    refetch();
  };

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
      <AttributeEditForm
        attribute={attribute}
        isOpen={editOpen}
        onClose={closeAfterRefetch(setEditOpen)}
      />
      <AttributeDeleteForm
        data={attribute}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSubmit={closeAfterRefetch(setDeleteOpen)}
      />
    </>
  );
};

AttributeListAction.displayName = 'AttributeListAction';
