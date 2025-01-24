import { CloseIcon } from "@usertour-ui/icons";
import { Button } from "@usertour-ui/button";
import { Table } from "@tanstack/react-table";
import { useSegmentListContext } from "@/contexts/segment-list-context";
import { useCallback, useState } from "react";
import { BizUserRemoveForm } from "./bizuser-remove-form";
import { BizUser, Segment } from "@usertour-ui/types";

interface RemoveFromSegmentProps<TData> {
  table: Table<TData>;
  currentSegment: Segment;
}

export const RemoveFromSegment = function <TData>(
  props: RemoveFromSegmentProps<TData>
) {
  const { table, currentSegment } = props;

  const [openDelete, setOpenDelete] = useState(false);
  const [bizUserIds, setBizUserIds] = useState<string[]>([]);

  const handleOnClick = useCallback(() => {
    const rows = table.getFilteredSelectedRowModel().rows;
    const ids = [];
    for (const row of rows) {
      ids.push(row.getValue("id"));
    }
    if (ids.length > 0) {
      setBizUserIds(ids);
      setOpenDelete(true);
    }
  }, [table, bizUserIds]);

  return (
    <>
      <Button
        variant={"ghost"}
        className="h-8 text-primary hover:text-primary px-1"
        onClick={handleOnClick}
      >
        <CloseIcon className="mr-1" />
        Remove from this segment
      </Button>

      <BizUserRemoveForm
        open={openDelete}
        bizUserIds={bizUserIds}
        segment={currentSegment}
        onOpenChange={setOpenDelete}
        onSubmit={() => {
          setOpenDelete(false);
          // onSubmit("delete");
        }}
      />
    </>
  );
};

RemoveFromSegment.displayName = "RemoveFromSegment";
