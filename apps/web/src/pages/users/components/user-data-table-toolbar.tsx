'use client';

import { Table } from '@tanstack/react-table';
import { WebZIndex } from '@usertour/constants';
import { Conditions, validateConditions } from '@usertour/business-components';
import { useTranslation } from 'react-i18next';
import { conditionsIsSame } from '@usertour/helpers';
import {
  AttributeBizTypes,
  ColumnSetting,
  CurrentConditions,
  RulesCondition,
  Segment,
} from '@usertour/types';
import { Dispatch, SetStateAction, useCallback, useMemo, useRef, useState } from 'react';
import { UserAddToManualSegment } from './user-add-to-manual-segment';
import { DataTableViewOptions } from '@/components/segments/table';
import { CollapsibleSearch, useToast, Button } from '@usertour/ui';
import { UserDeleteFromSegment } from './user-delete-from-segment';
import { UserRemoveFromSegment } from './user-remove-from-segment';
import { useAppContext } from '@/contexts/app-context';
import { useListAttributesQuery, useUpdateSegmentMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { useTableSelection } from '@/hooks/use-table-selection';
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';

interface UserDataTableToolbarProps {
  table: Table<any>;
  currentSegment: Segment;
  // Owned by parent UserDataTable (query / pagination / data). Toolbar
  // only mutates query and the unsaved-conditions pointer.
  setQuery: Dispatch<SetStateAction<{ [key: string]: unknown }>>;
  setCurrentConditions: Dispatch<SetStateAction<CurrentConditions | undefined>>;
  refetch: () => Promise<unknown>;
}

export const UserDataTableToolbar = (props: UserDataTableToolbarProps) => {
  const { table, currentSegment, setQuery, setCurrentConditions, refetch } = props;
  const { t } = useTranslation();
  const { isViewOnly, project } = useAppContext();
  const { attributes: attributeList } = useListAttributesQuery(
    project?.id ?? '',
    AttributeBizTypes.Nil,
    { skip: !project?.id },
  );
  const [searchValue, setSearchValue] = useState('');
  const { hasSelection, getSelectedCount } = useTableSelection(table);

  const currentSegmentRef = useRef(currentSegment);
  currentSegmentRef.current = currentSegment;

  const lastProcessedConditionsRef = useRef<RulesCondition[] | null>(null);

  // Deep-copy the segment's saved data so the controlled `Conditions`
  // component can mutate freely without aliasing into the segment cache.
  // No reset-on-id effect: the parent remounts this subtree via
  // `key={currentSegment.id}`, so this initializer runs on each switch.
  const [conditions, setConditions] = useState<RulesCondition[]>(() =>
    structuredClone(currentSegment.data ?? []),
  );

  const filteredAttributes = useMemo(
    () => attributeList?.filter((attr) => attr.bizType === AttributeBizTypes.User) || [],
    [attributeList],
  );

  const [showFilterBar, setShowFilterBar] = useState((currentSegment.data?.length ?? 0) > 0);

  const { invoke: updateSegment } = useUpdateSegmentMutation();
  const { toast } = useToast();

  const updateSegmentColumns = useCallback(
    async (columns: ColumnSetting[]) => {
      if (!currentSegment) {
        return;
      }
      // No list refetch — column visibility/order is pure presentation
      // and the mutation's response feeds Apollo's normalized cache so
      // segmentList subscribers (sidebar, header) re-render with the
      // new `segment.columns` automatically.
      try {
        await updateSegment({ id: currentSegment.id, columns });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
      }
    },
    [currentSegment, updateSegment, toast],
  );

  const handleConditionsChange = useCallback(
    async (next: RulesCondition[]) => {
      setConditions(next);

      const segment = currentSegmentRef.current;
      if (!segment) return;

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
              <UserAddToManualSegment table={table} refetch={refetch} />
              {currentSegment.dataType === 'MANUAL' && (
                <UserRemoveFromSegment
                  table={table}
                  currentSegment={currentSegment}
                  refetch={refetch}
                />
              )}
              <UserDeleteFromSegment table={table} refetch={refetch} />
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
