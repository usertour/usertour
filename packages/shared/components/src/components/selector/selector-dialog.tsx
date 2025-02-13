import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@usertour-ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour-ui/form';
import { SpinnerIcon } from '@usertour-ui/icons';
import { Input } from '@usertour-ui/input';
import { useOpenSelector } from '@usertour-ui/shared-hooks';
import { useToast } from '@usertour-ui/use-toast';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

interface SelectorDialogProps {
  children: React.ReactNode;
  onSuccess: (output: any, buildUrl: string) => void;
  onFailed?: () => void;
  token: string;
  buildUrl?: string;
  isInput?: boolean;
  zIndex?: number;
}

const formSchema = z.object({
  buildUrl: z
    .string({
      required_error: "buildUrl can't empty.",
    })
    .max(100)
    .min(1),
});

type FormValues = z.infer<typeof formSchema>;
const defaultValues: Partial<FormValues> = {
  buildUrl: '',
};

export const SelectorDialog = (props: SelectorDialogProps) => {
  const { children, onSuccess, token, buildUrl = '', onFailed, isInput, zIndex = 1000 } = props;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentBuildUrl, setCurrentBuildUrl] = useState(buildUrl);

  const handleSelectorSuccess = useCallback(
    (output: any) => {
      if (output) {
        onSuccess(output, currentBuildUrl);
      } else if (onFailed) {
        onFailed();
      }
      setOpen(false);
    },
    [currentBuildUrl],
  );

  const openTarget = useOpenSelector(token, handleSelectorSuccess);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...defaultValues, buildUrl },
    mode: 'onChange',
  });

  const handleOnSubmit = useCallback(
    async (formData: FormValues) => {
      const { buildUrl } = formData;
      if (!buildUrl) {
        return toast({
          variant: 'destructive',
          title: "The url you willl open can't empty.",
        });
      }
      const initParams = {
        action: 'elementSelect',
        isInput: isInput,
      };
      setCurrentBuildUrl(buildUrl);
      openTarget.open(buildUrl, initParams);
    },
    [isInput],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="md:max-w-2xl	" style={{ zIndex }}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>Select element in builder </DialogTitle>
            </DialogHeader>
            <div>
              <div className="space-y-4 py-2 pb-4 pt-4">
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="buildUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Build Url</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter build Url" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter the URL where the element appears in your app.
                  <br />
                  Next, you'll be able to point and click at the element and have Usertour
                  automatically select it.
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                className="flex-none"
                type="submit"
                disabled={openTarget.isLoading}
                // onClick={handleOpenEditor}
              >
                {openTarget.isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

SelectorDialog.displayName = 'SelectorDialog';
