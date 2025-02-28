import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-ui/alert-dialog';

export const MemberDeleteForm = (props: {
  data: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}) => {
  const { data, open, onOpenChange } = props;
  // const [deleteMutation] = useMutation(deleteMember);
  // const { toast } = useToast();

  const handleDeleteSubmit = async () => {
    if (!data) {
      return;
    }
    try {
      // const ret = await deleteMutation({
      //   variables: {
      //     id: data.id,
      //   },
      // });
      // if (ret.data?.deleteMembers?.id) {
      //   toast({
      //     variant: 'success',
      //     title: 'The Member has been successfully deleted',
      //   });
      //   onSubmit(true);
      // }
    } catch (_) {
      // onSubmit(false);
      // toast({
      //   variant: 'destructive',
      //   title: getErrorMessage(error),
      // });
    }
  };

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the Member{' '}
            <span className="font-bold text-foreground">{data.name}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteSubmit}>Submit</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

MemberDeleteForm.displayName = 'MemberDeleteForm';
