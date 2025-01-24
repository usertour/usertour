import { useToast } from "@usertour-ui/use-toast";
import { useMutation } from "@apollo/client";
import { deleteSegment } from "@usertour-ui/gql";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@usertour-ui/alert-dialog";
import { Segment } from "@usertour-ui/types";
import { getErrorMessage } from "@usertour-ui/shared-utils";

export const UserSegmentDeleteForm = (props: {
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}) => {
  const { segment, open, onOpenChange, onSubmit } = props;
  const [mutation] = useMutation(deleteSegment);
  const { toast } = useToast();

  const handleDeleteSubmit = async () => {
    if (!segment) {
      return;
    }
    try {
      const ret = await mutation({
        variables: {
          id: segment.id,
        },
      });
      if (ret.data?.deleteSegment?.success) {
        toast({
          variant: "success",
          title: `The segment ${segment.name} has been successfully deleted`,
        });
        onSubmit(true);
        return;
      }
    } catch (error) {
      onSubmit(false);
      toast({
        variant: "destructive",
        title: getErrorMessage(error),
      });
    }
  };

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete segment</AlertDialogTitle>
          <AlertDialogDescription>
            Confirm deleting {segment.name}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteSubmit}>
            Yes, delete segment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

UserSegmentDeleteForm.displayName = "UserSegmentDeleteForm";
