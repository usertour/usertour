'use client';

import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useCompanyListContext } from '@/contexts/company-list-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Table } from '@tanstack/react-table';
import { Button } from '@usertour-ui/button';
import { Input } from '@usertour-ui/input';
import { Rules } from '@usertour-ui/shared-components';
import { conditionsIsSame } from '@usertour-ui/shared-utils';
import { AttributeBizTypes, RulesCondition, Segment } from '@usertour-ui/types';
import { ChangeEvent, useCallback, useState } from 'react';
import { AddCompanyManualSegment } from './add-manual-segment';
import { CompanySegmentCreateForm } from './create-form';
import { DataTableViewOptions } from './data-table-view-options';
import { DeleteCompanyFromSegment } from './delete-user';
import { RemoveFromSegment } from './remove-from-segment';
import { useAppContext } from '@/contexts/app-context';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  currentSegment: Segment;
}

export function DataTableToolbar<TData>({ table, currentSegment }: DataTableToolbarProps<TData>) {
  const { attributeList } = useAttributeListContext();
  const { setCurrentConditions } = useSegmentListContext();
  const { query, setQuery } = useCompanyListContext();
  const { isViewOnly } = useAppContext();
  const [searchValue, setSearchValue] = useState('');
  // const [mutation] = useMutation(updateSegment);
  // const { setQuery } = useCompanyListContext();

  const [open, setOpen] = useState(false);

  const handleOnClose = () => {
    setOpen(false);
    // refetch();
  };

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
        <DataTableViewOptions table={table} />

        <CompanySegmentCreateForm isOpen={open} onClose={handleOnClose} environmentId="" />
      </div>
      <div className="flex items-center justify-between">
        <Rules
          onDataChange={handleDataChange}
          defaultConditions={JSON.parse(JSON.stringify(currentSegment.data || []))}
          isHorizontal={true}
          isShowIf={false}
          key={currentSegment.id}
          filterItems={['group', 'company-attr']}
          addButtonText={'Add filter'}
          attributes={
            attributeList?.filter(
              (attr) =>
                attr.bizType === AttributeBizTypes.Company ||
                attr.bizType === AttributeBizTypes.Membership,
            ) || []
          }
          disabled={isViewOnly}
        />
      </div>
      {table.getFilteredSelectedRowModel().rows.length > 0 && (
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
}
