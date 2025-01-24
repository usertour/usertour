"use client";

import * as React from "react";
import { Icons } from "@/components/atoms/icons";
import { Button } from "@usertour-ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@usertour-ui/dialog";
import { Input } from "@usertour-ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@usertour-ui/form";
import { copyTheme } from "@usertour-ui/gql";
import { useMutation } from "@apollo/client";
import { useEffect, useState } from "react";
import { Theme } from "@usertour-ui/types";
import { getErrorMessage } from "@usertour-ui/shared-utils";
import { useToast } from "@usertour-ui/use-toast";

interface ThemeDuplicateFormProps {
  duplicateTheme: Theme;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  name: z
    .string({
      required_error: "Please enter your theme name.",
    })
    .max(30)
    .min(1),
});

type FormValues = z.infer<typeof formSchema>;

export const ThemeDuplicateForm = (props: ThemeDuplicateFormProps) => {
  const { onSuccess, duplicateTheme, open, onOpenChange } = props;
  const [copyMutation] = useMutation(copyTheme);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const showError = (title: string) => {
    toast({
      variant: "destructive",
      title,
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: duplicateTheme.name },
    mode: "onChange",
  });

  useEffect(() => {
    form.reset();
  }, [open]);

  async function handleOnSubmit(formValues: FormValues) {
    setIsLoading(true);
    try {
      const variables = {
        id: duplicateTheme.id,
        name: formValues.name,
      };
      const response = await copyMutation({ variables });
      if (response.data.copyTheme.id) {
        toast({
          variant: "success",
          title: "The theme has been successfully created",
        });
      }
      onSuccess();
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog defaultOpen={true} open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>Create New Theme</DialogTitle>
            </DialogHeader>
            <div>
              <div className="space-y-4 py-2 pb-4 pt-4">
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Theme name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter theme  name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

ThemeDuplicateForm.displayName = "ThemeDuplicateForm";
