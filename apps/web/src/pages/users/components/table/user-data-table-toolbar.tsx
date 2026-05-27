'use client';

import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { useUserListContext } from '@/contexts/user-list-context';
import { Table } from '@tanstack/react-table';
import { WebZIndex } from '@usertour/constants';
import { Conditions, validateConditions } from '@usertour/business-components';
import { useTranslation } from 'react-i18next';
import { conditionsIsSame } from '@usertour/helpers';
import { AttributeBizTypes, ColumnSetting, RulesCondition, Segment } from '@usertour/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddUserManualSegment } from '../operations';
import { DataTableViewOptions } from '@/components/segments/table';
import { CollapsibleSearch } from '@usertour/ui';
import { DeleteUserFromSegment } from '../operations';
import { RemoveFromSegment } from '../operations';
import { useAppContext } from '@/contexts/app-context';
import { useMutation } from '@apollo/client';
import { updateSegment } from '@usertour/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour/use-toast';
import { useTableSelection } from '@/hooks/use-table-selection';
import { Button } from '@usertour/button';
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';

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
  const { isViewOnly } = useAppContext();
  const { hasSelection, getSelectedCount } = useTableSelection(table);

  // Use ref to store currentSegment to avoid recreating handleDataChange when segment object changes
  const currentSegmentRef = useRef(currentSegment);
  currentSegmentRef.current = currentSegment;

  // Track the last processed conditions to prevent infinite loops
  const lastProcessedConditionsRef = useRef<RulesCondition[] | null>(null);

  // Conditions live as local state so the controlled Conditions component
  // can mutate them on every keystroke without round-tripping through the
  // segment context. Resets when the active segment changes.
  const [conditions, setConditions] = useState<RulesCondition[]>(() =>
    JSON.parse(JSON.stringify(currentSegment.data || [])),
  );
  useEffect(() => {
    setConditions(JSON.parse(JSON.stringify(currentSegment.data || [])));
    lastProcessedConditionsRef.current = null;
  }, [currentSegment.id]);

  const filteredAttributes = useMemo(
    () => attributeList?.filter((attr) => attr.bizType === AttributeBizTypes.User) || [],
    [attributeList],
  );

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

  const handleConditionsChange = useCallback(
    async (next: RulesCondition[]) => {
      // Always reflect the latest input in the controlled component, even
      // while invalid — visual fidelity matters more than gating here.
      setConditions(next);

      const segment = currentSegmentRef.current;
      if (!segment) return;

      // Skip downstream side effects for invalid conditions — pushing them
      // into the live query would break the segment fetch.
      const failures = validateConditions(next, { attributes: filteredAttributes });
      if (failures.length > 0) return;

      // Dedup against the last persisted snapshot — onChange fires per
      // keystroke and can land on the same final shape repeatedly.
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
              <AddUserManualSegment table={table} />
              {currentSegment.dataType === 'MANUAL' && (
                <RemoveFromSegment table={table} currentSegment={currentSegment} />
              )}
              <DeleteUserFromSegment table={table} />
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
        </div>
      </div>
    </>
  );
};
