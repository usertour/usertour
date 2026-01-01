'use client';

import { SpinnerIcon } from '@usertour-packages/icons';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-packages/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';
import { updateSegment } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { getErrorMessage } from '@usertour/helpers';
import { Segment } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { editSegmentFormSchema, EditSegmentFormValues } from '../../types/segment-form-schema';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

interface EditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  segment: Segment | undefined;
}

export const CompanySegmentEditDialog = (props: EditDialogProps) => {
  const { onClose, isOpen, segment } = props;
  const [mutation] = useMutation(updateSegment);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();

  const form = useForm<EditSegmentFormValues>({
    resolver: zodResolver(editSegmentFormSchema),
    defaultValues: { name: segment?.name },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset({ name: segment?.name });
  }, [isOpen]);

  const handleOnSubmit = React.useCallback(
    async (formValues: EditSegmentFormValues) => {
      if (!segment) {
        return;
      }
      try {
        const data = {
          id: segment.id,
          name: formValues.name,
        };
        setIsLoading(true);
        const ret = await mutation({ variables: { data } });
        setIsLoading(false);
        if (ret.data?.updateSegment?.id) {
          onClose();
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: getErrorMessage(error),
        });
        setIsLoading(false);
      }
    },
    [segment, mutation, onClose, toast],
  );

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>Update company Segment</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col space-y-4 mt-4 mb-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex flex-row">Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter company segment name"
                        className="w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onClose()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                Save Segment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

CompanySegmentEditDialog.displayName = 'CompanySegmentEditDialog';
