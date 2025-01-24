import { Delete2Icon } from "@usertour-ui/icons";
import { Button } from "@usertour-ui/button";
import { Table } from "@tanstack/react-table"
import { useCallback, useState } from "react";
import { Segment } from "@usertour-ui/types";
import { BizCompanyDeleteForm } from "./bizuser-delete-form";

interface DeleteCompanyFromSegmentProps<TData> {
  table: Table<TData>
}

export const DeleteCompanyFromSegment = function <TData>(props: DeleteCompanyFromSegmentProps<TData>) {
  const { table } = props;

  const [openDelete, setOpenDelete] = useState(false);
  const [bizCompanyIds, setBizCompanyIds] = useState<string[]>([]);

  const handleOnClick = useCallback(() => {
    const rows = table.getFilteredSelectedRowModel().rows;
    const ids = [];
    for (const row of rows) {
      ids.push(row.getValue("id"))
    }
    if (ids.length > 0) {
      setBizCompanyIds(ids)
      setOpenDelete(true);
    }
  }, [table, bizCompanyIds])
  return (
    <>    <Button variant={"ghost"} className="h-8 text-primary hover:text-primary px-1 text-red-600 hover:text-red-600 hover:bg-red-100" onClick={handleOnClick}>
      <Delete2Icon className="mr-1" />
      Delete company
    </Button>
      <BizCompanyDeleteForm
        open={openDelete}
        bizCompanyIds={bizCompanyIds}
        onOpenChange={setOpenDelete}
        onSubmit={() => {
          setOpenDelete(false);
          // onSubmit("delete");
        }}
      />
    </>

  );
};

DeleteCompanyFromSegment.displayName = "DeleteCompanyFromSegment";
