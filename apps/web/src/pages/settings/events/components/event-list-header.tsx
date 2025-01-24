import { useState } from "react";
import { EventCreateForm } from "./event-create-form";
import { Button } from "@usertour-ui/button";
import { useEventListContext } from "@/contexts/event-list-context";
import { OpenInNewWindowIcon } from "@radix-ui/react-icons";

export const EventListHeader = () => {
  const [open, setOpen] = useState(false);
  const { refetch } = useEventListContext();
  const handleCreate = () => {
    setOpen(true);
  };
  const handleOnClose = () => {
    setOpen(false);
    refetch();
  };
  return (
    <>
      <div className="relative ">
        <div className="flex flex-col space-y-2">
          <div className="flex flex-row justify-between ">
            <h3 className="text-2xl font-semibold tracking-tight">Events</h3>
            <Button onClick={handleCreate}>New Events</Button>
          </div>
        </div>
      </div>
      <EventCreateForm isOpen={open} onClose={handleOnClose} />
    </>
  );
};

EventListHeader.displayName = "EventListHeader";
