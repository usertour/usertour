'use client';

import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { useCompanyListContext } from '@/contexts/company-list-context';
import { Table } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { WebZIndex } from '@usertour/constants';
import { Conditions, validateConditions } from '@usertour/business-components';
import { conditionsIsSame } from '@usertour/helpers';
import { AttributeBizTypes, ColumnSetting, RulesCondition, Segment } from '@usertour/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AddCompanyManualSegment } from '../operations';
import { CompanySegmentCreateDialog } from '../dialogs';
import { DataTableViewOptions } from '@/components/molecules/segment/table';
import { CollapsibleSearch } from '@/components/molecules/collapsible-search';
import { DeleteCompanyFromSegment } from '../operations';
import { RemoveFromSegment } from '../operations';
import { useAppContext } from '@/contexts/app-context';
import { useMutation } from '@apollo/client';
import { updateSegment } from '@usertour/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/use-toast';
import { useTableSelection } from '@/hooks/use-table-selection';
import { Button } from '@usertour/button';
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';

interface CompanyDataTableToolbarProps {
  table: Table<any>;
  currentSegment: Segment;
}

export const CompanyDataTableToolbar = ({
  table,
  currentSegment,
}: CompanyDataTableToolbarProps) => {
  const { t } = useTranslation();
  const { attributeList, loading: attributeLoading } = useAttributeListContext();
  const { setCurrentConditions } = useSegmentListContext();

  // Filtered attributes for company rules
  const filteredAttributes = attributeLoading
    ? []
    : attributeList?.filter(
        (attr) =>
          attr.bizType === AttributeBizTypes.Company ||
          attr.bizType === AttributeBizTypes.Membership,
      ) || [];

  const { setQuery, refetch: refetchCompanyList } = useCompanyListContext();
  const [searchValue, setSearchValue] = useState('');
  const { hasSelection, getSelectedCount } = useTableSelection(table);
  const { isViewOnly, environment } = useAppContext();

  // Use ref to store currentSegment to avoid recreating the change handler
  // when segment object changes
  const currentSegmentRef = useRef(currentSegment);
  currentSegmentRef.current = currentSegment;

  // Track the last processed conditions to prevent infinite loops
  const lastProcessedConditionsRef = useRef<RulesCondition[] | null>(null);

  // Conditions are controlled by this toolbar — local state mirrors what's
  // shown in the Conditions component, resets when the active segment
  // changes.
  const [conditions, setConditions] = useState<RulesCondition[]>(() =>
    JSON.parse(JSON.stringify(currentSegment.data || [])),
  );
  useEffect(() => {
    setConditions(JSON.parse(JSON.stringify(currentSegment.data || [])));
    lastProcessedConditionsRef.current = null;
  }, [currentSegment.id]);

  const [open, setOpen] = useState(false);
  const handleOnClose = () => {
    setOpen(false);
  };

  const [showFilterBar, setShowFilterBar] = useState((currentSegment.data?.length ?? 0) > 0);

  const [mutation] = useMutation(updateSegment);
  const { toast } = useToast();

  const updateSegmentColumns = useCallback(
    async (columns: ColumnSetting[]) => {
      if (!currentSegment) {
        return;
      }
      const data = {
        id: currentSegment.id,
        columns,
      };
      try {
        const ret = await mutation({ variables: { data } });
        if (ret.data?.updateSegment?.id) {
          await refetchCompanyList();
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
      }
    },
    [currentSegment, mutation, refetchCompanyList, toast],
  );

  const handleConditionsChange = useCallback(
    async (next: RulesCondition[]) => {
      // Reflect every keystroke in the controlled component's value.
      setConditions(next);

      const segment = currentSegmentRef.current;
      if (!segment) return;

      // Skip downstream side effects for invalid conditions to keep the live
      // segment query from blowing up on partial input.
      const failures = validateConditions(next, { attributes: filteredAttributes });
      if (failures.length > 0) return;

      const isSameAsLastProcessed =
        lastProcessedConditionsRef.current !== null &&
        conditionsIsSame(next, lastProcessedConditionsRef.current);
      lastProcessedConditionsRef.current = next;
      if (isSameAsLastProcessed) return;

      setQuery((prev) => ({ ...prev, data: next }));
      if (next.length === 0) return;
      setCurrentConditions({ segmentId: segment.id, data: next });
    },
    [filteredAttributes, setCurrentConditions, setQuery],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      setQuery((prev) => ({ ...prev, search: value }));
    },
    [setQuery],
  );

  return (
    <>
      {showFilterBar && (
        <div className="flex items-center justify-between">
          <Conditions
            conditions={conditions}
            onChange={handleConditionsChange}
            isHorizontal
            isShowIf={false}
            filterItems={['group', 'user-attr']}
            attributes={filteredAttributes}
            disabled={isViewOnly}
            baseZIndex={WebZIndex.RULES}
            t={t}
            addLabelKey="conditions.actions.addFilter"
          />
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-row items-center gap-2">
          {hasSelection() ? (
            <>
              <span className="text-sm text-muted-foreground pl-1">
                {t('common.rowsSelected', { count: getSelectedCount() })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground"
                onClick={() => table.resetRowSelection()}
                aria-label={t('common.clearSelection')}
              >
                <Cross2Icon className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <AddCompanyManualSegment table={table} />
              {currentSegment.dataType === 'MANUAL' && (
                <RemoveFromSegment table={table} currentSegment={currentSegment} />
              )}
              <DeleteCompanyFromSegment table={table} />
            </>
          ) : !showFilterBar ? (
            <Button
              variant="ghost"
              className="h-8 px-2 text-muted-foreground"
              onClick={() => setShowFilterBar(true)}
              disabled={isViewOnly}
            >
              <PlusIcon className="mr-1 h-4 w-4" />
              {t('common.addFilter')}
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <CollapsibleSearch
            value={searchValue}
            onChange={handleSearchChange}
            placeholder={t('common.search')}
          />
          <DataTableViewOptions
            table={table}
            onColumnsChange={updateSegmentColumns}
            disabled={isViewOnly}
          />

          <CompanySegmentCreateDialog
            isOpen={open}
            onClose={handleOnClose}
            environmentId={environment?.id}
          />
        </div>
      </div>
    </>
  );
};
