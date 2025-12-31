'use client';

import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { useUserListContext } from '@/contexts/user-list-context';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Table } from '@tanstack/react-table';
import { Button } from '@usertour-packages/button';
import { Input } from '@usertour-packages/input';
import { WebZIndex } from '@usertour-packages/constants';
import { Rules } from '@usertour-packages/shared-components';
import { conditionsIsSame } from '@usertour/helpers';
import { AttributeBizTypes, RulesCondition, Segment } from '@usertour/types';
import { ChangeEvent, useCallback, useState } from 'react';
import { AddUserManualSegment } from '../operations';
import { UserSegmentCreateDialog } from '../dialogs';
import { DataTableViewOptions } from '@/components/molecules/segment/table';
import { DeleteUserFromSegment } from '../operations';
import { RemoveFromSegment } from '../operations';
import { useAppContext } from '@/contexts/app-context';
import { useMutation } from '@apollo/client';
import { updateSegment } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';

interface UserDataTableToolbarProps<TData> {
  table: Table<TData>;
  currentSegment: Segment;
}

export function UserDataTableToolbar<TData>({
  table,
  currentSegment,
}: UserDataTableToolbarProps<TData>) {
  const { attributeList } = useAttributeListContext();
  const { setCurrentConditions, refetch } = useSegmentListContext();
  const { query, setQuery } = useUserListContext();
  const [searchValue, setSearchValue] = useState('');
  const { isViewOnly } = useAppContext();

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
          await refetch();
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
      }
    },
    [currentSegment, mutation, refetch, toast],
  );

  const handleDataChange = useCallback(
    async (conditions: RulesCondition[], hasError: boolean) => {
      if (!hasError) {
        setQuery({ ...query, data: conditions });
      }
      if (
        hasError ||
        !currentSegment ||
        conditions.length === 0 ||
        conditionsIsSame(conditions, currentSegment.data)
      ) {
        return;
      }
      setCurrentConditions({ segmentId: currentSegment.id, data: conditions });
    },
    [currentSegment, query],
  );

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchValue(event.target.value);
      setQuery({ ...query, search: event.target.value });
    },
    [query],
  );

  const handleSearchReset = useCallback(() => {
    setSearchValue('');
    setQuery({ ...query, search: '' });
  }, [query]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Search..."
            value={searchValue}
            onChange={handleSearchChange}
            className="h-8 w-[150px] lg:w-[250px]"
          />
          {searchValue !== '' && (
            <Button variant="ghost" onClick={handleSearchReset} className="h-8 px-2 lg:px-3">
              Reset
              <Cross2Icon className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        <DataTableViewOptions table={table} onColumnVisibilityChange={updateSegmentColumn} />

        <UserSegmentCreateDialog isOpen={open} onClose={handleOnClose} environmentId="" />
      </div>
      <div className="flex items-center justify-between">
        <Rules
          onDataChange={handleDataChange}
          defaultConditions={JSON.parse(JSON.stringify(currentSegment.data || []))}
          isHorizontal={true}
          isShowIf={false}
          key={currentSegment.id}
          filterItems={['group', 'user-attr']}
          addButtonText={'Add filter'}
          attributes={
            attributeList?.filter((attr) => attr.bizType === AttributeBizTypes.User) || []
          }
          disabled={isViewOnly}
          baseZIndex={WebZIndex.RULES}
        />
      </div>
      {table.getFilteredSelectedRowModel().rows.length > 0 && (
        <div className="flex flex-row space-x-2">
          <AddUserManualSegment table={table} />
          {currentSegment.dataType === 'MANUAL' && (
            <RemoveFromSegment table={table} currentSegment={currentSegment} />
          )}
          <DeleteUserFromSegment table={table} />
        </div>
      )}
    </>
  );
}
