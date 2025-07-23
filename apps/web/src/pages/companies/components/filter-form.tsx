'use client';

import { Icons } from '@/components/atoms/icons';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
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
import { createSegment } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { RadioGroup, RadioGroupItem } from '@usertour-packages/radio-group';
import { getErrorMessage } from '@usertour/helpers';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface CreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  environmentId: string | undefined;
}

const formSchema = z.object({
  dataType: z.enum(['CONDITION', 'MANUAL']),
  name: z
    .string({
      required_error: 'Please company segment name.',
    })
    .max(20)
    .min(2),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  name: '',
  dataType: 'CONDITION',
};

export const UserSegmentFilterForm = (props: CreateFormProps) => {
  const { onClose, isOpen, environmentId } = props;
  const [createMutation] = useMutation(createSegment);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset();
  }, [isOpen]);

  async function handleOnSubmit(formValues: FormValues) {
    try {
      const data = {
        ...formValues,
        bizType: 'USER',
        data: {},
        environmentId,
      };
      setIsLoading(true);
      const ret = await createMutation({ variables: { data } });
      setIsLoading(false);
      if (ret.data?.createSegment?.id) {
        onClose();
      }
    } catch (error) {
      showError(getErrorMessage(error));
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>Create Company Segment</DialogTitle>
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
              <FormField
                control={form.control}
                name="dataType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex flex-row">
                      Segment Type
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs bg-slate-700">
                            <p>Determines which kind of segment can be set.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-row space-x-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="CONDITION" />
                          </FormControl>
                          <FormLabel className="font-normal">Filter</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="MANUAL" />
                          </FormControl>
                          <FormLabel className="font-normal">Manual</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
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
                Create Segment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

UserSegmentFilterForm.displayName = 'UserSegmentFilterForm';
