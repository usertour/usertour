import { zodResolver } from "@hookform/resolvers/zod";
import { EyeOpenIcon } from "@radix-ui/react-icons";
import { Button } from "@usertour-ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@usertour-ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@usertour-ui/form";
import { SpinnerIcon } from "@usertour-ui/icons";
import { Input } from "@usertour-ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useBuilderContext } from "../../contexts";
import { usePreview } from "../../hooks/use-preivew";
import { EXTENSION_PREVIEW_DIALOG } from "@usertour-ui/constants";

export const SidebarHeader = (props: { title: string }) => {
  const { title } = props;
  const {
    environmentId,
    currentContent,
    currentLocation,
    currentVersion,
    usertourjsUrl,
    zIndex,
    envToken,
  } = useBuilderContext();
  const { preview, isLoading } = usePreview({ usertourjsUrl });
  // const handlePreview = () => {
  //   preview(url, {
  //     environmentId,
  //     contentId,
  //     testUser: { id: 123 }
  //   })
  // }
  const formSchema = z.object({
    url: z
      .string({
        required_error: "Please input your app url.",
      })
      .max(200)
      .min(4),
  });

  type FormValues = z.infer<typeof formSchema>;

  const defaultValues: Partial<FormValues> = {
    url: currentLocation || currentContent?.buildUrl,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  async function onSubmit(formValues: FormValues) {
    preview(formValues.url, {
      environmentId,
      contentId: currentContent?.id,
      versionId: currentVersion?.id,
      testUser: { id: 123 },
      token: envToken,
    });
  }

  return (
    <>
      <div className="grow leading-6 text-base truncate ...">{title}</div>
      {/* <div className="flex-none">
        <Dialog defaultOpen={false}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-auto px-2 py-1 text-xs rounded-[4px]  "
            >
              <EyeOpenIcon className="mr-1" />
              Preview
            </Button>
          </DialogTrigger>

          <DialogContent
            className="max-w-xl"
            style={{ zIndex: zIndex + EXTENSION_PREVIEW_DIALOG }}
          >
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <DialogHeader>
                  <DialogTitle>Preview flow</DialogTitle>
                  <DialogDescription>
                    You're about to start the flow in draft mode, running inside
                    your own app. <br />
                    This will only affect you. Regular users will not see it
                    until you publish it.
                  </DialogDescription>
                </DialogHeader>
                <div>
                  <div className="space-y-4 py-2 pb-4 pt-4">
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your app's URL</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://my.app.com"
                                {...field}
                              />
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
                      <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Submit
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div> */}
    </>
  );
};
SidebarHeader.displayName = "SidebarHeader";
