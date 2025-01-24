import { Delete2Icon } from "@usertour-ui/icons";
import { Button } from "@usertour-ui/button";
import { Table } from "@tanstack/react-table"
import { useCallback, useState } from "react";
import { Segment } from "@usertour-ui/types";
import { BizUserDeleteForm } from "./bizuser-delete-form";

interface DeleteUserFromSegmentProps<TData> {
  table: Table<TData>
}

export const DeleteUserFromSegment = function <TData>(props: DeleteUserFromSegmentProps<TData>) {
  const { table } = props;

  const [openDelete, setOpenDelete] = useState(false);
  const [bizUserIds, setBizUserIds] = useState<string[]>([]);

  const handleOnClick = useCallback(() => {
    const rows = table.getFilteredSelectedRowModel().rows;
    const ids = [];
    for (const row of rows) {
      ids.push(row.getValue("id"))
    }
    if (ids.length > 0) {
      setBizUserIds(ids)
      setOpenDelete(true);
    }
  }, [table, bizUserIds])
  return (
    <>    <Button variant={"ghost"} className="h-8 text-primary hover:text-primary px-1 text-red-600 hover:text-red-600 hover:bg-red-100" onClick={handleOnClick}>
      <Delete2Icon className="mr-1" />
      Delete user
    </Button>
      <BizUserDeleteForm
        open={openDelete}
        bizUserIds={bizUserIds}
        onOpenChange={setOpenDelete}
        onSubmit={() => {
          setOpenDelete(false);
          // onSubmit("delete");
        }}
      />
    </>

  );
};

DeleteUserFromSegment.displayName = "DeleteUserFromSegment";
