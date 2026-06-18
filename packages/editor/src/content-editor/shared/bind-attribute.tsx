// Bind to user attribute component for question editors

import { BooleanField, ComboboxSelect } from '@usertour/ui';
import { useListAttributesQuery } from '@usertour/hooks';
import { Attribute, AttributeBizTypes, BizAttributeTypes } from '@usertour/types';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AttributeCreateForm } from '../../form/attribute-create-form';

export interface BindAttributeProps {
  bindToAttribute: boolean;
  selectedAttribute?: string;
  zIndex: number;
  onBindChange: (checked: boolean) => void;
  onAttributeChange: (value: string) => void;
  dataType?: BizAttributeTypes;
  projectId: string;
  popoverContentClassName?: string;
}

export const BindAttribute = ({
  bindToAttribute,
  selectedAttribute,
  zIndex,
  onBindChange,
  onAttributeChange,
  dataType = BizAttributeTypes.Number,
  projectId,
  popoverContentClassName,
}: BindAttributeProps) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { attributes, refetch } = useListAttributesQuery(projectId, AttributeBizTypes.User);
  const { t } = useTranslation();

  // Handle after attribute creation
  const handleAfterCreate = useCallback(
    async (attribute: Partial<Attribute>) => {
      setShowCreateForm(false);
      await refetch();
      if (attribute.codeName) {
        onAttributeChange(attribute.codeName);
      }
    },
    [attributes, onAttributeChange, refetch],
  );

  const handleAttributeChange = (value: string) => {
    if (value === 'create-new') {
      setShowCreateForm(true);
    } else {
      onAttributeChange(value);
    }
  };

  const filteredAttributes = attributes?.filter(
    (attr) =>
      attr.bizType === AttributeBizTypes.User && !attr.predefined && attr.dataType === dataType,
  );

  return (
    <div className="flex flex-col gap-2">
      <BooleanField
        label={t('contentBuilder.editor.bindAttribute.bind')}
        tooltip={t('contentBuilder.editor.bindAttribute.bindTooltip')}
        checked={bindToAttribute}
        onChange={onBindChange}
      />

      {bindToAttribute && (
        <>
          <ComboboxSelect
            size="compact"
            surface="raised"
            value={selectedAttribute}
            onValueChange={handleAttributeChange}
            placeholder={t('contentBuilder.editor.bindAttribute.select')}
            searchPlaceholder={t('contentBuilder.editor.bindAttribute.search')}
            emptyText={t('contentBuilder.editor.bindAttribute.empty')}
            groups={[
              {
                heading: t('contentBuilder.editor.bindAttribute.userAttributes'),
                options: (filteredAttributes ?? []).map((attr) => ({
                  value: attr.codeName,
                  label: attr.displayName,
                })),
              },
              {
                heading: t('contentBuilder.editor.bindAttribute.actions'),
                options: [
                  {
                    value: 'create-new',
                    label: t('contentBuilder.editor.bindAttribute.createNew'),
                  },
                ],
              },
            ]}
            contentClassName={popoverContentClassName}
            contentStyle={{ zIndex }}
          />

          <AttributeCreateForm
            onOpenChange={setShowCreateForm}
            onSuccess={handleAfterCreate}
            isOpen={showCreateForm}
            projectId={projectId}
            zIndex={zIndex + 1}
            defaultValues={{
              dataType: String(dataType),
              bizType: String(AttributeBizTypes.User),
            }}
            disabledFields={['dataType', 'bizType']}
          />
        </>
      )}
    </div>
  );
};

BindAttribute.displayName = 'BindAttribute';
