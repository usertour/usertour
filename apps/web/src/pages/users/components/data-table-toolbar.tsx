"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";
import { Button } from "@usertour-ui/button";
import { Input } from "@usertour-ui/input";
import { DataTableViewOptions } from "./data-table-view-options";
import { FilterIcon } from "@usertour-ui/icons";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { UserSegmentCreateForm } from "./create-form";
import { RulesCondition, Segment } from "@usertour-ui/types";
import { Rules } from "@usertour-ui/shared-components";
import { useAttributeListContext } from "@/contexts/attribute-list-context";
import { useSegmentListContext } from "@/contexts/segment-list-context";
import { AddUserManualSegment } from "./add-manual-segment";
import { RemoveFromSegment } from "./remove-from-segment";
import { DeleteUserFromSegment } from "./delete-user";
import { conditionsIsSame } from "@usertour-ui/shared-utils";
import { useUserListContext } from "@/contexts/user-list-context";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  currentSegment: Segment;
}

export function DataTableToolbar<TData>({
  table,
  currentSegment,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const { attributeList } = useAttributeListContext();
  const { setCurrentConditions } = useSegmentListContext();
  const { query, setQuery } = useUserListContext();
  const [searchValue, setSearchValue] = useState("");
  // const [mutation] = useMutation(updateSegment);
  // const { setQuery } = useUserListContext();

  const [open, setOpen] = useState(false);
  const handleCreate = () => {
    setOpen(true);
  };
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
        conditions.length == 0 ||
        conditionsIsSame(conditions, currentSegment.data)
      ) {
        return;
      }
      setCurrentConditions({ segmentId: currentSegment.id, data: conditions });
    },
    [currentSegment, query]
  );

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchValue(event.target.value);
      setQuery({ ...query, search: event.target.value });
    },
    [query]
  );

  const handleSearchReset = useCallback(() => {
    setSearchValue("");
    setQuery({ ...query, search: "" });
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
          {searchValue != "" && (
            <Button
              variant="ghost"
              onClick={handleSearchReset}
              className="h-8 px-2 lg:px-3"
            >
              Reset
              <Cross2Icon className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        <DataTableViewOptions table={table} />

        <UserSegmentCreateForm
          isOpen={open}
          onClose={handleOnClose}
          environmentId=""
        />
      </div>
      <div className="flex items-center justify-between">
        <Rules
          onDataChange={handleDataChange}
          defaultConditions={JSON.parse(
            JSON.stringify(currentSegment.data || [])
          )}
          isHorizontal={true}
          isShowIf={false}
          key={currentSegment.id}
          filterItems={["group", "user-attr"]}
          addButtonText={"Add filter"}
          attributes={attributeList}
        />
      </div>
      {table.getFilteredSelectedRowModel().rows.length > 0 && (
        <div className="flex flex-row space-x-2">
          <AddUserManualSegment table={table} />
          {currentSegment.dataType == "MANUAL" && (
            <RemoveFromSegment table={table} currentSegment={currentSegment} />
          )}
          <DeleteUserFromSegment table={table} />
        </div>
      )}
    </>
  );
}
