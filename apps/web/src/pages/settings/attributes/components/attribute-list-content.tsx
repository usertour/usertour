import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { Attribute } from '@usertour/types';
import { Badge } from '@usertour/badge';
import { RiShieldCheckFill } from '@usertour/icons';
import { ResourceListBody, type ResourceTableColumn } from '@usertour/ui';
import { AttributeListAction } from './attribute-list-action';

interface AttributeListContentProps {
  bizType: number;
}

const DATA_TYPE_LABEL: Record<number, string> = {
  1: 'Number',
  2: 'String',
  3: 'Boolean',
  4: 'List',
  5: 'DateTime',
  6: 'RandomAB',
  7: 'RandomNumber',
};

// Predefined-first ordering keeps system attributes grouped at the top
// across all bizType tabs.
const sortAttributes = (attributes: readonly Attribute[]) =>
  [...attributes].sort((left, right) =>
    left.predefined === right.predefined ? 0 : left.predefined ? -1 : 1,
  );

export const AttributeListContent = ({ bizType }: AttributeListContentProps) => {
  const { attributeList, loading } = useAttributeListContext();
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
      cell: (attribute) => DATA_TYPE_LABEL[attribute.dataType] ?? '',
    },
    {
      header: '',
      headerClassName: 'w-20',
      cell: (attribute) => <AttributeListAction attribute={attribute} />,
    },
  ];

  return (
    <ResourceListBody<Attribute>
      columns={columns}
      rows={rows}
      loading={loading}
      getRowKey={(attribute) => attribute.id}
    />
  );
};

AttributeListContent.displayName = 'AttributeListContent';
