import { Fragment, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, ChevronUpIcon, CopyIcon } from '@radix-ui/react-icons';
import { Attribute, AttributeBizTypes, AttributeDataType } from '@usertour/types';
import { TableCell, TableRow } from '@usertour/ui';
import { Button } from '@usertour/ui';
import { cn } from '@usertour/tailwind';
import { TruncatedText } from '@usertour/ui';
import { AttributeTypeChip } from '@/components/attribute-type-chip';
import { formatAttributeValue } from '@/utils/common';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';

interface MembershipAttr {
  name: string;
  value: unknown;
  dataType: AttributeDataType;
  codeName: string;
}

const buildMembershipAttrs = (
  data: Record<string, unknown> | null | undefined,
  attributeList: Attribute[] | undefined,
): MembershipAttr[] => {
  if (!data || !attributeList) return [];

  const membershipAttrs = attributeList.filter(
    (attr) => attr.bizType === AttributeBizTypes.Membership,
  );

  return Object.entries(data)
    .map(([key, value]): [string, unknown, Attribute | undefined] => [
      key,
      value,
      membershipAttrs.find((attr) => attr.codeName === key),
    ])
    .filter(([, , attr]) => !!attr)
    .map(([key, value, attr]) => ({
      name: attr!.displayName || key,
      value,
      dataType: attr!.dataType ?? AttributeDataType.String,
      codeName: key,
    }))
    .sort((a, b) => {
      const indexA = attributeList.findIndex((attr) => attr.codeName === a.codeName);
      const indexB = attributeList.findIndex((attr) => attr.codeName === b.codeName);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
};

interface MembershipRowProps {
  identity: ReactNode;
  membershipData: Record<string, unknown> | null | undefined;
  attributeList: Attribute[] | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  colSpan: number;
}

export const MembershipRow = ({
  identity,
  membershipData,
  attributeList,
  isExpanded,
  onToggle,
  colSpan,
}: MembershipRowProps) => {
  const { t } = useTranslation();
  const copyWithToast = useCopyWithToast();

  const attrs = buildMembershipAttrs(membershipData, attributeList);
  const hasAttrs = attrs.length > 0;

  return (
    <Fragment>
      <TableRow
        className={cn('group', hasAttrs ? 'cursor-pointer' : 'cursor-default hover:bg-transparent')}
        onClick={hasAttrs ? onToggle : undefined}
        data-state={isExpanded ? 'selected' : undefined}
      >
        <TableCell className="overflow-hidden">{identity}</TableCell>
        <TableCell className="overflow-hidden">
          {hasAttrs ? (
            <span className="text-sm text-muted-foreground">
              {t('common.membership.attributesCount', { count: attrs.length })}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/70">{t('common.membership.none')}</span>
          )}
        </TableCell>
        <TableCell className="w-10">
          {hasAttrs &&
            (isExpanded ? (
              <ChevronUpIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            ))}
        </TableCell>
      </TableRow>
      {isExpanded && hasAttrs && (
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableCell colSpan={colSpan} className="p-0">
            <div className="text-sm">
              {attrs.map((attr) => {
                const formattedValue = formatAttributeValue(attr.value, attr.dataType);
                const isDateTime = attr.dataType === AttributeDataType.DateTime;
                const textToCopy = String(isDateTime ? attr.value : formattedValue);

                return (
                  <div
                    key={attr.codeName}
                    className="group/attr flex flex-row border-b last:border-0 min-w-0"
                  >
                    <div className="font-medium w-2/5 min-w-0 p-2 leading-6">
                      <div className="break-words">{attr.name}</div>
                    </div>
                    <div className="w-3/5 min-w-0 p-2 break-words leading-6">
                      {isDateTime ? (
                        <TruncatedText
                          text={formattedValue}
                          className="max-w-full"
                          rawValue={attr.value}
                        />
                      ) : (
                        formattedValue
                      )}
                      <AttributeTypeChip dataType={attr.dataType} />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 m-2 rounded invisible group-hover/attr:visible flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyWithToast(textToCopy);
                      }}
                    >
                      <CopyIcon className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
};

MembershipRow.displayName = 'MembershipRow';
