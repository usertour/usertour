'use client';

import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { useCompanyListContext } from '@/contexts/company-list-context';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Table } from '@tanstack/react-table';
import { Button } from '@usertour-packages/button';
import { Input } from '@usertour-packages/input';
import { useTranslation } from 'react-i18next';
import { WebZIndex } from '@usertour-packages/constants';
import { Rules } from '@usertour-packages/shared-components';
import { conditionsIsSame } from '@usertour/helpers';
import { AttributeBizTypes, RulesCondition, Segment } from '@usertour/types';
import { ChangeEvent, useCallback, useRef, useState } from 'react';
import { AddCompanyManualSegment } from '../operations';
import { CompanySegmentCreateDialog } from '../dialogs';
import { DataTableViewOptions } from '@/components/molecules/segment/table';
import { DeleteCompanyFromSegment } from '../operations';
import { RemoveFromSegment } from '../operations';
import { useAppContext } from '@/contexts/app-context';
import { useMutation } from '@apollo/client';
import { updateSegment } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useTableSelection } from '@/hooks/use-table-selection';

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
  const { hasSelection } = useTableSelection(table);
  const { isViewOnly, environment } = useAppContext();

  // Use ref to store currentSegment to avoid recreating handleDataChange when segment object changes
  const currentSegmentRef = useRef(currentSegment);
  currentSegmentRef.current = currentSegment;

  // Track the last processed conditions to prevent infinite loops
  const lastProcessedConditionsRef = useRef<RulesCondition[] | null>(null);

  const [open, setOpen] = useState(false);
  const handleOnClose = () => {
    setOpen(false);
  };

  const [mutation] = useMutation(updateSegment);
  const { toast } = useToast();

  const updateSegmentColumn = useCallback(
    async (name: string, value: boolean) => {
      if (!currentSegment) {
        return;
      }
      const data = {
        id: currentSegment.id,
        columns: { ...currentSegment.columns, [name]: value },
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

  const handleDataChange = useCallback(
    async (conditions: RulesCondition[], hasError: boolean) => {
      const segment = currentSegmentRef.current;

      // Early return if error or no segment
      if (hasError || !segment) {
        return;
      }

      // Check if conditions are the same as the last processed ones (prevents infinite loop)
      const isSameAsLastProcessed =
        lastProcessedConditionsRef.current !== null &&
        conditionsIsSame(conditions, lastProcessedConditionsRef.current);
      // Also check against original segment data for initial state
      const isSameAsOriginal = conditionsIsSame(conditions, segment.data);

      if (isSameAsLastProcessed || isSameAsOriginal) {
        return;
      }

      // Update the ref BEFORE calling setQuery to prevent re-processing
      lastProcessedConditionsRef.current = conditions;

      setQuery((prev) => ({ ...prev, data: conditions }));

      if (conditions.length === 0) {
        return;
      }

      setCurrentConditions({ segmentId: segment.id, data: conditions });
    },
    [setCurrentConditions, setQuery],
  );

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchValue(event.target.value);
      setQuery((prev) => ({ ...prev, search: event.target.value }));
    },
    [setQuery],
  );

  const handleSearchReset = useCallback(() => {
    setSearchValue('');
    setQuery((prev) => ({ ...prev, search: '' }));
  }, [setQuery]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder={t('common.search')}
            value={searchValue}
            onChange={handleSearchChange}
            className="h-8 w-[150px] lg:w-[250px]"
          />
          {searchValue !== '' && (
            <Button variant="ghost" onClick={handleSearchReset} className="h-8 px-2 lg:px-3">
              {t('common.reset')}
              <Cross2Icon className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        <DataTableViewOptions table={table} onColumnVisibilityChange={updateSegmentColumn} />

        <CompanySegmentCreateDialog
          isOpen={open}
          onClose={handleOnClose}
          environmentId={environment?.id}
        />
      </div>
      <div className="flex items-center justify-between">
        <Rules
          onDataChange={handleDataChange}
          defaultConditions={JSON.parse(JSON.stringify(currentSegment.data || []))}
          isHorizontal={true}
          isShowIf={false}
          key={currentSegment.id}
          filterItems={['group', 'user-attr']}
          addButtonText={t('common.addFilter')}
          attributes={filteredAttributes}
          disabled={isViewOnly}
          baseZIndex={WebZIndex.RULES}
        />
      </div>
      {hasSelection() && (
        <div className="flex flex-row space-x-2">
          <AddCompanyManualSegment table={table} />
          {currentSegment.dataType === 'MANUAL' && (
            <RemoveFromSegment table={table} currentSegment={currentSegment} />
          )}
          <DeleteCompanyFromSegment table={table} />
        </div>
      )}
    </>
  );
};
