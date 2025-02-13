export const SidebarHeader = (props: { title: string }) => {
  const { title } = props;

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
SidebarHeader.displayName = 'SidebarHeader';
