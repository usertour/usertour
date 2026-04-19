'use client';

import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { useUserListContext } from '@/contexts/user-list-context';
import { Table } from '@tanstack/react-table';
import { WebZIndex } from '@usertour-packages/constants';
import { Rules } from '@usertour-packages/shared-components';
import { useTranslation } from 'react-i18next';
import { conditionsIsSame } from '@usertour/helpers';
import { AttributeBizTypes, ColumnSetting, RulesCondition, Segment } from '@usertour/types';
import { useCallback, useRef, useState } from 'react';
import { AddUserManualSegment } from '../operations';
import { UserSegmentCreateDialog } from '../dialogs';
import { DataTableViewOptions } from '@/components/molecules/segment/table';
import { CollapsibleSearch } from '@/components/molecules/collapsible-search';
import { DeleteUserFromSegment } from '../operations';
import { RemoveFromSegment } from '../operations';
import { useAppContext } from '@/contexts/app-context';
import { useMutation } from '@apollo/client';
import { updateSegment } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useTableSelection } from '@/hooks/use-table-selection';
import { Button } from '@usertour-packages/button';
import { Cross2Icon } from '@radix-ui/react-icons';

interface UserDataTableToolbarProps {
  table: Table<any>;
  currentSegment: Segment;
}

export const UserDataTableToolbar = ({ table, currentSegment }: UserDataTableToolbarProps) => {
  const { t } = useTranslation();
  const { attributeList } = useAttributeListContext();
  const { setCurrentConditions } = useSegmentListContext();
  const { setQuery, refetch: refetchUserList } = useUserListContext();
  const [searchValue, setSearchValue] = useState('');
  const { isViewOnly, environment } = useAppContext();
  const { hasSelection, getSelectedCount } = useTableSelection(table);

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
          await refetchUserList();
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
      }
    },
    [currentSegment, mutation, refetchUserList, toast],
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

      // Always update the ref to track current state
      lastProcessedConditionsRef.current = conditions;

      if (isSameAsLastProcessed) {
        return;
      }

      setQuery((prev) => ({ ...prev, data: conditions }));

      if (conditions.length === 0) {
        return;
      }

      setCurrentConditions({ segmentId: segment.id, data: conditions });
    },
    [setCurrentConditions, setQuery],
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
      <div className="flex items-center justify-between">
        <Rules
          onDataChange={handleDataChange}
          defaultConditions={JSON.parse(JSON.stringify(currentSegment.data || []))}
          isHorizontal={true}
          isShowIf={false}
          key={currentSegment.id}
          filterItems={['group', 'user-attr']}
          addButtonText={t('common.addFilter')}
          attributes={
            attributeList?.filter((attr) => attr.bizType === AttributeBizTypes.User) || []
          }
          disabled={isViewOnly}
          baseZIndex={WebZIndex.RULES}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-row items-center gap-2">
          {hasSelection() && (
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
              <AddUserManualSegment table={table} />
              {currentSegment.dataType === 'MANUAL' && (
                <RemoveFromSegment table={table} currentSegment={currentSegment} />
              )}
              <DeleteUserFromSegment table={table} />
            </>
          )}
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

          <UserSegmentCreateDialog
            isOpen={open}
            onClose={handleOnClose}
            environmentId={environment?.id}
          />
        </div>
      </div>
    </>
  );
};
