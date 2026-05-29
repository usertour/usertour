import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useListAttributesQuery } from '@usertour/hooks';
import { useAppContext } from '@/contexts/app-context';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { Attribute, AttributeBizTypes } from '@usertour/types';
import { Badge, ResourceListBody, type ResourceTableColumn } from '@usertour/ui';
import { RiShieldCheckFill } from '@usertour/icons';
import { AttributeRowActions } from './attribute-row-actions';

interface AttributeListContentProps {
  bizType: number;
}

// AttributeBizType numeric ids → i18n key under `settings.attributes.form.dataTypes`.
// Resolved at render via `t()` rather than at module load so locale switches take effect.
const DATA_TYPE_I18N_KEY: Record<number, string> = {
  1: 'settings.attributes.form.dataTypes.number',
  2: 'settings.attributes.form.dataTypes.string',
  3: 'settings.attributes.form.dataTypes.boolean',
  4: 'settings.attributes.form.dataTypes.list',
  5: 'settings.attributes.form.dataTypes.dateTime',
  6: 'settings.attributes.form.dataTypes.randomAB',
  7: 'settings.attributes.form.dataTypes.randomNumber',
};

// Predefined-first ordering keeps system attributes grouped at the top
// across all bizType tabs.
const sortAttributes = (attributes: readonly Attribute[]) =>
  [...attributes].sort((left, right) =>
    left.predefined === right.predefined ? 0 : left.predefined ? -1 : 1,
  );

export const AttributeListContent = (props: AttributeListContentProps) => {
  const { bizType } = props;
  const { project } = useAppContext();
  const { attributes: attributeList, loading } = useListAttributesQuery(
    project?.id ?? '',
    AttributeBizTypes.Nil,
    { ...SHARED_CACHE_QUERY_OPTIONS, skip: !project?.id },
  );
  const { t } = useTranslation();

  const rows = useMemo(
    () => sortAttributes((attributeList ?? []).filter((attr) => attr.bizType === bizType)),
    [attributeList, bizType],
  );

  const columns: ResourceTableColumn<Attribute>[] = [
    {
      header: t('settings.attributes.columns.displayName'),
      className: 'truncate',
      cell: (attribute) => (
        <div className="flex flex-col">
          <span className="flex items-center gap-1.5 truncate">
            {attribute.displayName}
            {attribute.predefined ? (
              <Badge
                variant="secondary"
                className="gap-1 px-1.5 py-0 font-normal text-muted-foreground"
              >
                <RiShieldCheckFill className="h-3 w-3 text-foreground" />
                {t('settings.attributes.systemBadge')}
              </Badge>
            ) : null}
          </span>
          {attribute.description ? (
            <span className="text-xs text-muted-foreground truncate">{attribute.description}</span>
          ) : null}
        </div>
      ),
    },
    {
      header: t('settings.attributes.columns.codeName'),
      className: 'truncate',
      cell: (attribute) => attribute.codeName,
    },
    {
      header: t('settings.attributes.columns.dataType'),
      headerClassName: 'w-28 hidden sm:table-cell',
      className: 'hidden sm:table-cell',
      cell: (attribute) => {
        const key = DATA_TYPE_I18N_KEY[attribute.dataType];
        return key ? t(key) : '';
      },
    },
    {
      header: '',
      headerClassName: 'w-20',
      cell: (attribute) => <AttributeRowActions attribute={attribute} />,
    },
  ];

  return (
    <ResourceListBody<Attribute>
      columns={columns}
      rows={rows}
      loading={loading}
      empty={t('settings.attributes.empty')}
      getRowKey={(attribute) => attribute.id}
    />
  );
};

AttributeListContent.displayName = 'AttributeListContent';
