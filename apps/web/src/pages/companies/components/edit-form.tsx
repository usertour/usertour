'use client';

import { Icons } from '@/components/atoms/icons';
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
import { getErrorMessage } from '@usertour-packages/utils';
import { Segment } from '@usertour-packages/types';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface EditFormProps {
  isOpen: boolean;
  onClose: () => void;
  segment: Segment | undefined;
}

const formSchema = z.object({
  name: z
    .string({
      required_error: 'Please company segment name.',
    })
    .max(20)
    .min(2),
});

type FormValues = z.infer<typeof formSchema>;

export const UserSegmentEditForm = (props: EditFormProps) => {
  const { onClose, isOpen, segment } = props;
  const [mutation] = useMutation(updateSegment);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: segment?.name },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset({ name: segment?.name });
  }, [isOpen]);

  const handleOnSubmit = React.useCallback(
    async (formValues: FormValues) => {
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
    [segment],
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
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Save Segment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

UserSegmentEditForm.displayName = 'UserSegmentEditForm';
