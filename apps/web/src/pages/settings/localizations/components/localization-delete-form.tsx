import { useMutation } from '@apollo/client';
import { deleteLocalization } from '@usertour/gql';
import { getErrorMessage } from '@usertour/helpers';
import { Localization } from '@usertour/types';
import { DeleteConfirmDialog } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';
import { useState } from 'react';

interface LocalizationDeleteFormProps {
  data: Localization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const LocalizationDeleteForm = ({
  data,
  open,
  onOpenChange,
  onSubmit,
}: LocalizationDeleteFormProps) => {
  const [deleteMutation] = useMutation(deleteLocalization);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!data) {
      return;
    }
    setLoading(true);
    try {
      const result = await deleteMutation({ variables: { id: data.id } });
      if (result.data?.deleteLocalization?.id) {
        toast({
          variant: 'success',
          title: 'The localization has been successfully deleted',
        });
        onSubmit(true);
        onOpenChange(false);
      }
    } catch (error) {
      onSubmit(false);
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DeleteConfirmDialog
      resourceLabel="localization"
      name={data.name}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      loading={loading}
      confirmLabel="Submit"
    />
  );
};

LocalizationDeleteForm.displayName = 'LocalizationDeleteForm';
